#!/bin/bash
# Deploy Ansin to Yandex Cloud (Hybrid: Object Storage + Serverless Container)
#
# Hybrid Architecture:
# - Static pages (/, /products/*, /categories/*) → Object Storage + CDN
# - Dynamic routes (/admin/*, /api/*) → Serverless Container
# - API Gateway routes between them
#
# Security: Secrets are managed via Yandex Lockbox dashboard (not synced during deployment)

set -e

# Silence YC CLI version check warnings (useful for isolated/slow networks)
export YC_CLI_INITIALIZATION_SILENCE=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load only deploy-related variables from .env (whitelist)
if [ -f .env ]; then
  DEPLOY_KEYS="YC_LOCKBOX_SECRET_ID YC_SERVICE_ACCOUNT_ID YC_FOLDER_ID YC_API_GATEWAY_DOMAIN YANDEX_STORAGE_BUCKET YANDEX_STORAGE_ACCESS_KEY YANDEX_STORAGE_SECRET_KEY YANDEX_STORAGE_REGION"
  for key in $DEPLOY_KEYS; do
    val=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" .env 2>/dev/null | sed 's/^[^=]*=[[:space:]]*//;s/[[:space:]]*$//;s/^["'\'']//;s/["'\'']$//')
    [ -n "$val" ] && export "$key=$val"
  done
else
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Required for deploy (BETTER_AUTH_URL is derived from API Gateway at deploy time)
for req in YC_LOCKBOX_SECRET_ID YC_SERVICE_ACCOUNT_ID YC_FOLDER_ID; do
  if [ -z "${!req}" ]; then
    echo -e "${RED}Error: $req is required in .env for deployment${NC}"
    exit 1
  fi
done

# Configuration
CONTAINER_NAME="ansin-server"
BUCKET_NAME="ansin-static"
IMAGE_TAG="latest"
CACHE_FILE=".yandex-cache"
API_GATEWAY_NAME="ansin-gateway"
API_GATEWAY_TEMPLATE="yandex-api-gateway.yaml.template"
API_GATEWAY_SPEC="yandex-api-gateway.yaml"
AUTO_CLEANUP_REGISTRY=${AUTO_CLEANUP_REGISTRY:-true}
KEEP_IMAGES=${KEEP_IMAGES:-10}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Ansin Hybrid Deployment to Yandex Cloud             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Read secret from .env file
read_secret() {
  local key=$1
  grep "^${key}=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs
}

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================
echo -e "${GREEN}[1/11] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed${NC}"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo -e "${RED}Error: Docker is not running${NC}"
  exit 1
fi

if ! command -v yc &> /dev/null; then
  echo -e "${RED}Error: Yandex CLI (yc) is not installed${NC}"
  echo -e "${YELLOW}Install: curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash${NC}"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm is not installed${NC}"
  exit 1
fi

if ! command -v aws &> /dev/null; then
  echo -e "${YELLOW}Warning: AWS CLI not found. Installing...${NC}"
  if command -v brew &> /dev/null; then
    brew install awscli
  elif command -v pip3 &> /dev/null; then
    pip3 install awscli --user
  else
    echo -e "${RED}Error: Cannot install AWS CLI. Please install manually: https://aws.amazon.com/cli/${NC}"
    exit 1
  fi
fi

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq not found. Installing...${NC}"
  if command -v brew &> /dev/null; then
    brew install jq
  elif command -v apt-get &> /dev/null; then
    sudo apt-get install -y jq
  else
    echo -e "${RED}Error: Cannot install jq. Please install manually${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Remove orphan "ansin" container if it exists (deploy uses ansin-server only)
if yc serverless container get ansin &> /dev/null; then
  echo -e "${YELLOW}Removing orphan container 'ansin' (deploy uses ansin-server)...${NC}"
  yc serverless container delete --name ansin --async 2>/dev/null || true
fi

# ============================================================================
# STEP 2: Read Lockbox keys (used later for container secret flags)
# ============================================================================
echo -e "${GREEN}[2/11] Reading Lockbox keys...${NC}"

LOCKBOX_KEYS=$(yc lockbox secret list-versions --id "$YC_LOCKBOX_SECRET_ID" --format json 2>/dev/null \
  | jq -r '.[0].payload_entry_keys[]' 2>/dev/null) || true

if [ -z "$LOCKBOX_KEYS" ]; then
  echo -e "${RED}Error: Cannot read Lockbox secret: $YC_LOCKBOX_SECRET_ID${NC}"
  echo -e "${YELLOW}Run: ./scripts/sync-lockbox.sh${NC}"
  exit 1
fi

# Build --secret flags dynamically from whatever keys exist in Lockbox
# Skip keys that are set via --environment to avoid duplicates
ENV_KEYS="BETTER_AUTH_URL NODE_ENV YANDEX_STORAGE_BUCKET YANDEX_STORAGE_ACCESS_KEY YANDEX_STORAGE_SECRET_KEY YANDEX_STORAGE_REGION GITHUB_REPO"
SECRET_FLAGS=""
while IFS= read -r key; do
  [ -z "$key" ] && continue
  echo "$ENV_KEYS" | grep -qw "$key" && continue
  SECRET_FLAGS="$SECRET_FLAGS --secret environment-variable=$key,id=$YC_LOCKBOX_SECRET_ID,key=$key"
done <<< "$LOCKBOX_KEYS"

LOCKBOX_COUNT=$(echo "$LOCKBOX_KEYS" | grep -c .)
echo -e "${GREEN}✓ Lockbox: $LOCKBOX_COUNT keys loaded${NC}"

# ============================================================================
# STEP 3: Build Application
# ============================================================================
echo -e "${GREEN}[3/11] Building application...${NC}"

pnpm build

if [ ! -d "dist/client" ] || [ ! -d "dist/server" ]; then
  echo -e "${RED}Error: Build failed - dist/client or dist/server not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Application built successfully${NC}"
echo -e "  - dist/client/ (static pages for Object Storage)"
echo -e "  - dist/server/ (SSR server for Container)"

# ============================================================================
# STEP 4: Verify Object Storage Bucket
# ============================================================================
echo -e "${GREEN}[4/11] Verifying Object Storage...${NC}"

# Check cache first to avoid slow API call
BUCKET_CACHED=$(grep "^BUCKET_CONFIGURED=" "$CACHE_FILE" 2>/dev/null | cut -d'=' -f2)

if [ "$BUCKET_CACHED" = "true" ]; then
  echo -e "${GREEN}✓ Bucket verified (cached): $BUCKET_NAME${NC}"
else
  # Only check/create bucket on first deploy or if cache missing
  if yc storage bucket get $BUCKET_NAME &> /dev/null; then
    echo -e "${GREEN}✓ Bucket exists: $BUCKET_NAME${NC}"
  else
    echo -e "${YELLOW}Creating bucket...${NC}"
    yc storage bucket create --name $BUCKET_NAME --public-read
    
    yc storage bucket update --name $BUCKET_NAME \
      --website-settings '{
        "index": "index.html",
        "error": "404.html"
      }'
    
    echo -e "${GREEN}✓ Bucket created and configured${NC}"
  fi
  
  # Cache bucket existence
  echo "BUCKET_CONFIGURED=true" >> "$CACHE_FILE"
fi

# ============================================================================
# STEP 5: Upload Static Files to Object Storage
# ============================================================================
echo -e "${GREEN}[5/11] Uploading static files to Object Storage...${NC}"

# Configure AWS CLI for Yandex Cloud S3-compatible API
export AWS_ENDPOINT_URL="https://storage.yandexcloud.net"
export AWS_DEFAULT_REGION="ru-central1"

# Use existing Yandex Storage credentials from .env
if [ -z "$YANDEX_STORAGE_ACCESS_KEY" ] || [ -z "$YANDEX_STORAGE_SECRET_KEY" ]; then
  echo -e "${RED}Error: YANDEX_STORAGE_ACCESS_KEY and YANDEX_STORAGE_SECRET_KEY are required in .env${NC}"
  echo -e "${YELLOW}These are needed for AWS CLI to upload files to Object Storage${NC}"
  exit 1
fi

# Map to AWS CLI environment variables
export AWS_ACCESS_KEY_ID="$YANDEX_STORAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$YANDEX_STORAGE_SECRET_KEY"

echo -e "${GREEN}✓ Using Yandex Storage credentials from .env${NC}"

# Configure AWS CLI for optimal parallel performance (20 concurrent uploads)
aws configure set default.s3.max_concurrent_requests 20
aws configure set default.s3.multipart_threshold 8MB
aws configure set default.s3.multipart_chunksize 8MB

# Apply CORS for presigned URL uploads (client uploads directly to storage)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
aws s3api put-bucket-cors --bucket "$BUCKET_NAME" \
  --cors-configuration "file://${SCRIPT_DIR}/storage-cors.json" \
  --endpoint-url https://storage.yandexcloud.net 2>/dev/null || true

TOTAL_FILES=$(find dist/client -type f | wc -l | tr -d ' ')
echo -e "${YELLOW}Uploading $TOTAL_FILES files in parallel (20 concurrent)...${NC}"

# Upload static assets with long cache (1 year, immutable)
aws s3 sync dist/client/ s3://$BUCKET_NAME/ \
  --endpoint-url https://storage.yandexcloud.net \
  --exclude "*.html" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE \
  --only-show-errors \
  --no-progress

# Upload HTML files with short cache (1 hour for fresh content)
aws s3 sync dist/client/ s3://$BUCKET_NAME/ \
  --endpoint-url https://storage.yandexcloud.net \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=3600" \
  --content-type "text/html; charset=utf-8" \
  --metadata-directive REPLACE \
  --only-show-errors \
  --no-progress

echo -e "${GREEN}✓ Static files synced successfully${NC}"
echo -e "  - Synced $TOTAL_FILES files (20 concurrent, only changed files)"

# ============================================================================
# STEP 6: Verify Container Registry
# ============================================================================
echo -e "${GREEN}[6/11] Verifying Container Registry...${NC}"

# Try to use cached registry ID
if [ -f "$CACHE_FILE" ]; then
  REGISTRY_ID=$(grep "^REGISTRY_ID=" "$CACHE_FILE" 2>/dev/null | head -1 | cut -d'=' -f2)
  if [ -n "$REGISTRY_ID" ]; then
    echo -e "${GREEN}✓ Using cached registry ID: $REGISTRY_ID${NC}"
  fi
fi

# If not cached, fetch or create
if [ -z "$REGISTRY_ID" ]; then
  REGISTRY_ID=$(yc container registry list --format json 2>/dev/null | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$REGISTRY_ID" ]; then
    echo -e "${YELLOW}Creating new registry...${NC}"
    yc container registry create --name ansin-registry
    REGISTRY_ID=$(yc container registry list --format json | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
  fi
  
  # Initialize cache file (overwrite to avoid duplicates)
  echo "REGISTRY_ID=$REGISTRY_ID" > "$CACHE_FILE"
fi

# Configure Docker authentication
if ! grep -q "cr.yandex" ~/.docker/config.json 2>/dev/null; then
  yc container registry configure-docker
fi

echo -e "${GREEN}✓ Registry ready: $REGISTRY_ID${NC}"

# ============================================================================
# STEP 7: Build Docker Image
# ============================================================================
echo -e "${GREEN}[7/11] Building Docker image...${NC}"

IMAGE_NAME="cr.yandex/$REGISTRY_ID/$CONTAINER_NAME:$IMAGE_TAG"

DOCKER_BUILDKIT=1 docker build \
  -t $IMAGE_NAME \
  --platform linux/amd64 \
  --pull \
  .

echo -e "${GREEN}✓ Image built: $IMAGE_NAME${NC}"

# ============================================================================
# STEP 8: Push Image to Registry
# ============================================================================
echo -e "${GREEN}[8/11] Pushing image to registry...${NC}"

docker push $IMAGE_NAME

echo -e "${GREEN}✓ Image pushed successfully${NC}"

# ============================================================================
# STEP 9: Deploy Serverless Container
# ============================================================================
echo -e "${GREEN}[9/11] Deploying Serverless Container...${NC}"

# Try to get gateway URL for BETTER_AUTH_URL (may not exist on first deploy)
DEPLOY_BETTER_AUTH_URL="https://placeholder"
if yc serverless api-gateway get $API_GATEWAY_NAME &> /dev/null; then
  GATEWAY_DOMAIN=$(yc serverless api-gateway get $API_GATEWAY_NAME --format json | grep -o '"domain": "[^"]*' | cut -d'"' -f4)
  [ -n "$GATEWAY_DOMAIN" ] && DEPLOY_BETTER_AUTH_URL="https://$GATEWAY_DOMAIN"
fi

# Check if container exists
if yc serverless container get $CONTAINER_NAME &> /dev/null; then
  echo -e "${YELLOW}Creating new revision...${NC}"
else
  echo -e "${YELLOW}Creating new container...${NC}"
  yc serverless container create --name $CONTAINER_NAME
fi

# Deploy with Lockbox secrets and environment variables
yc serverless container revision deploy \
  --container-name $CONTAINER_NAME \
  --image $IMAGE_NAME \
  --memory 512m \
  --cores 1 \
  --execution-timeout 60s \
  --concurrency 4 \
  --service-account-id $YC_SERVICE_ACCOUNT_ID \
  --folder-id $YC_FOLDER_ID \
  --environment "BETTER_AUTH_URL=$DEPLOY_BETTER_AUTH_URL" \
  --environment "NODE_ENV=production" \
  --environment "YANDEX_STORAGE_BUCKET=${YANDEX_STORAGE_BUCKET:-ansin-static}" \
  --environment "YANDEX_STORAGE_ACCESS_KEY=$YANDEX_STORAGE_ACCESS_KEY" \
  --environment "YANDEX_STORAGE_SECRET_KEY=$YANDEX_STORAGE_SECRET_KEY" \
  --environment "YANDEX_STORAGE_REGION=${YANDEX_STORAGE_REGION:-ru-central1}" \
  --environment "GITHUB_REPO=$(read_secret GITHUB_REPO)" \
  $SECRET_FLAGS

# Authenticated invoke: API Gateway uses YC_SERVICE_ACCOUNT_ID to invoke the container.
# 1. Deny unauthenticated access (direct container URL returns 403)
# 2. Grant the API Gateway's service account the invoker role
yc serverless container deny-unauthenticated-invoke $CONTAINER_NAME 2>/dev/null || true
yc serverless container add-access-binding $CONTAINER_NAME \
  --role serverless.containers.invoker \
  --service-account-id $YC_SERVICE_ACCOUNT_ID 2>/dev/null || true

# Get container info
CONTAINER_ID=$(yc serverless container get $CONTAINER_NAME --format json | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
CONTAINER_URL=$(yc serverless container get $CONTAINER_NAME --format json | grep -o '"url": "[^"]*' | cut -d'"' -f4)

# Update cache file (preserve BUCKET_CONFIGURED, update others)
echo "REGISTRY_ID=$REGISTRY_ID" > "$CACHE_FILE"
echo "CONTAINER_ID=$CONTAINER_ID" >> "$CACHE_FILE"
echo "BUCKET_CONFIGURED=true" >> "$CACHE_FILE"

echo -e "${GREEN}✓ Container deployed${NC}"
echo -e "  - Container ID: $CONTAINER_ID"
echo -e "  - Container URL: $CONTAINER_URL"

# ============================================================================
# STEP 10: Update API Gateway
# ============================================================================
echo -e "${GREEN}[10/11] Updating API Gateway configuration...${NC}"

# Generate API Gateway spec from template
if [ ! -f "$API_GATEWAY_TEMPLATE" ]; then
  echo -e "${RED}Error: Template file not found: $API_GATEWAY_TEMPLATE${NC}"
  exit 1
fi

sed "s/<SERVICE_ACCOUNT_ID>/$YC_SERVICE_ACCOUNT_ID/g; s/<CONTAINER_ID>/$CONTAINER_ID/g; s/<BUCKET_NAME>/$BUCKET_NAME/g" \
  "$API_GATEWAY_TEMPLATE" > "$API_GATEWAY_SPEC"

# Check if API Gateway exists
if yc serverless api-gateway get $API_GATEWAY_NAME &> /dev/null; then
  echo -e "${YELLOW}Updating existing API Gateway...${NC}"
  yc serverless api-gateway update $API_GATEWAY_NAME --spec "$API_GATEWAY_SPEC"
else
  echo -e "${YELLOW}Creating new API Gateway...${NC}"
  yc serverless api-gateway create \
    --name $API_GATEWAY_NAME \
    --spec "$API_GATEWAY_SPEC" \
    --description "Ansin catalog API Gateway"
fi

GATEWAY_URL=$(yc serverless api-gateway get $API_GATEWAY_NAME --format json | grep -o '"domain": "[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ API Gateway configured${NC}"
echo -e "  - Gateway URL: https://$GATEWAY_URL"

# ============================================================================
# STEP 11: Redeploy Container with Correct BETTER_AUTH_URL
# ============================================================================
# Container must use the gateway URL for auth callbacks. Redeploy with correct URL.
echo -e "${GREEN}[11/11] Updating container with production auth URL...${NC}"

yc serverless container revision deploy \
  --container-name $CONTAINER_NAME \
  --image $IMAGE_NAME \
  --memory 512m \
  --cores 1 \
  --execution-timeout 60s \
  --concurrency 4 \
  --service-account-id $YC_SERVICE_ACCOUNT_ID \
  --folder-id $YC_FOLDER_ID \
  --environment "BETTER_AUTH_URL=https://$GATEWAY_URL" \
  --environment "NODE_ENV=production" \
  --environment "YANDEX_STORAGE_BUCKET=${YANDEX_STORAGE_BUCKET:-ansin-static}" \
  --environment "YANDEX_STORAGE_ACCESS_KEY=$YANDEX_STORAGE_ACCESS_KEY" \
  --environment "YANDEX_STORAGE_SECRET_KEY=$YANDEX_STORAGE_SECRET_KEY" \
  --environment "YANDEX_STORAGE_REGION=${YANDEX_STORAGE_REGION:-ru-central1}" \
  --environment "GITHUB_REPO=$(read_secret GITHUB_REPO)" \
  $SECRET_FLAGS

echo -e "${GREEN}✓ Container updated with BETTER_AUTH_URL=https://$GATEWAY_URL${NC}"

# ============================================================================
# Cleanup: Docker Images
# ============================================================================
echo -e "${YELLOW}Cleaning up local Docker images...${NC}"

# Remove old local images
OLD_IMAGES=$(docker images "cr.yandex/$REGISTRY_ID/$CONTAINER_NAME" --format "{{.ID}} {{.CreatedAt}}" | tail -n +2 | awk '{print $1}')
if [ -n "$OLD_IMAGES" ]; then
  echo "$OLD_IMAGES" | xargs -r docker rmi -f 2>/dev/null || true
fi

docker image prune -f > /dev/null 2>&1 || true

echo -e "${GREEN}✓ Cleaned up local images${NC}"

# ============================================================================
# Cleanup: Registry Images (Optional)
# ============================================================================
if [ "$AUTO_CLEANUP_REGISTRY" = true ]; then
  echo -e "${YELLOW}Cleaning up old registry images...${NC}"
  
  IMAGES_JSON=$(yc container image list --registry-id $REGISTRY_ID --format json 2>/dev/null)
  
  if [ -n "$IMAGES_JSON" ] && [ "$IMAGES_JSON" != "[]" ]; then
    IMAGE_IDS=$(echo "$IMAGES_JSON" | \
      jq -r --arg container "$CONTAINER_NAME" \
      '.[] | select(.name | contains($container)) | .id + " " + .created_at' | \
      sort -k2 -r | \
      awk '{print $1}')
    
    TOTAL_IMAGES=$(echo "$IMAGE_IDS" | wc -l | tr -d ' ')
    
    if [ "$TOTAL_IMAGES" -gt "$KEEP_IMAGES" ]; then
      DELETE_COUNT=$((TOTAL_IMAGES - KEEP_IMAGES))
      IMAGES_TO_DELETE=$(echo "$IMAGE_IDS" | tail -n +$((KEEP_IMAGES + 1)))
      
      DELETED=0
      if [ -n "$IMAGES_TO_DELETE" ]; then
        while IFS= read -r IMAGE_ID; do
          if [ -n "$IMAGE_ID" ] && yc container image delete "$IMAGE_ID" --async &> /dev/null; then
            DELETED=$((DELETED + 1))
          fi
        done <<< "$IMAGES_TO_DELETE"
      fi
      
      echo -e "${GREEN}✓ Deleted $DELETED old images (keeping last $KEEP_IMAGES)${NC}"
    else
      echo -e "${GREEN}✓ No cleanup needed ($TOTAL_IMAGES images)${NC}"
    fi
  fi
fi

# ============================================================================
# Deployment Complete
# ============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Deployment Complete! 🎉                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  • Static Pages: Object Storage ($BUCKET_NAME)"
echo -e "  • SSR Container: $CONTAINER_NAME"
echo -e "  • API Gateway: $API_GATEWAY_NAME"
echo -e "  • Public URL: https://$GATEWAY_URL"
echo ""
echo -e "${YELLOW}Architecture:${NC}"
echo -e "  Static Pages  → Object Storage + CDN"
echo -e "    /, /products/*, /categories/*, /cart, /checkout"
echo ""
echo -e "  Dynamic Routes → Serverless Container"
echo -e "    /admin/*, /api/*"
echo ""
echo -e "${YELLOW}Test Your Deployment:${NC}"
echo -e "  • Homepage:  ${BLUE}https://$GATEWAY_URL/${NC}"
echo -e "  • Admin:     ${BLUE}https://$GATEWAY_URL/admin/${NC}"
echo -e "  • Health:    ${BLUE}https://$GATEWAY_URL/api/health${NC}"
echo ""
echo -e "${YELLOW}Security:${NC} Container uses authenticated invoke. Only API Gateway (via service account) can invoke."
echo -e "  Direct container URL returns 403. Always use the API Gateway URL above."
echo ""

# ============================================================================
# Mark deployment as completed in database
# ============================================================================
DEPLOY_SECRET=$(read_secret DEPLOY_SECRET)
if [ -n "$DEPLOY_SECRET" ] && [ -n "$GATEWAY_URL" ]; then
  echo -e "${YELLOW}Marking deployment as completed...${NC}"

  DEPLOY_MARKED=false
  for ATTEMPT in 1 2 3; do
    # Wait for the new container revision to become ready
    [ "$ATTEMPT" -gt 1 ] && echo -e "${YELLOW}Retry $ATTEMPT/3 (waiting 10s for container to start)...${NC}" && sleep 10

    DEPLOY_RESPONSE=$(curl -s --max-time 15 -X POST "https://$GATEWAY_URL/api/admin/deploy/complete" \
      -H "Authorization: Bearer $DEPLOY_SECRET" \
      -H "Content-Type: application/json" \
      -d '{"source": "local"}' \
      2>/dev/null)

    if echo "$DEPLOY_RESPONSE" | grep -q '"success"'; then
      echo -e "${GREEN}✓ Deployment marked as completed${NC}"
      DEPLOY_MARKED=true
      break
    fi
  done

  if [ "$DEPLOY_MARKED" = false ]; then
    echo -e "${YELLOW}Warning: Could not mark deployment after 3 attempts${NC}"
    echo -e "${YELLOW}  Pending changes will remain visible in the admin dashboard.${NC}"
    echo -e "${YELLOW}  Response: $DEPLOY_RESPONSE${NC}"
  fi
fi

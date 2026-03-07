#!/bin/bash
# Sync secrets from .env to Yandex Lockbox (single active version)
set -e

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BLUE='\033[0;34m' NC='\033[0m'

# --- Config ---
REQUIRED_KEYS="TURSO_DATABASE_URL TURSO_AUTH_TOKEN BETTER_AUTH_SECRET ADMIN_EMAILS GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET"
OPTIONAL_KEYS="RESEND_API_KEY GITHUB_PAT DEPLOY_SECRET"

# --- Load .env ---
[ ! -f .env ] && echo -e "${RED}.env not found${NC}" && exit 1

read_env() {
  grep -E "^[[:space:]]*${1}[[:space:]]*=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs
}

YC_LOCKBOX_SECRET_ID=$(read_env YC_LOCKBOX_SECRET_ID)
[ -z "$YC_LOCKBOX_SECRET_ID" ] && echo -e "${RED}YC_LOCKBOX_SECRET_ID not set${NC}" && exit 1

echo -e "${BLUE}Syncing secrets to Lockbox${NC} ($YC_LOCKBOX_SECRET_ID)"

# --- Validate required keys ---
MISSING=0
for key in $REQUIRED_KEYS; do
  val=$(read_env "$key")
  if [ -z "$val" ]; then
    echo -e "${RED}  ✗ $key missing${NC}"
    MISSING=1
  fi
done
[ $MISSING -eq 1 ] && exit 1

# --- Build payload from required + present optional keys ---
PAYLOAD='['
FIRST=1
TOTAL=0
for key in $REQUIRED_KEYS $OPTIONAL_KEYS; do
  val=$(read_env "$key")
  [ -z "$val" ] && continue
  [ $FIRST -eq 0 ] && PAYLOAD="${PAYLOAD},"
  PAYLOAD="${PAYLOAD}{\"key\": \"$key\", \"text_value\": \"$val\"}"
  FIRST=0
  TOTAL=$((TOTAL + 1))
done
PAYLOAD="${PAYLOAD}]"

echo -e "${GREEN}  $TOTAL keys ready${NC}"

# --- Get old version IDs before creating new one ---
OLD_VERSIONS=$(yc lockbox secret list-versions --id "$YC_LOCKBOX_SECRET_ID" --format json 2>/dev/null \
  | jq -r '.[].id' 2>/dev/null || true)

# --- Create new version ---
yc lockbox secret add-version "$YC_LOCKBOX_SECRET_ID" --payload "$PAYLOAD" > /dev/null
echo -e "${GREEN}  New version created${NC}"

# --- Schedule destruction of all old versions ---
if [ -n "$OLD_VERSIONS" ]; then
  DESTROYED=0
  for vid in $OLD_VERSIONS; do
    yc lockbox secret schedule-version-destruction "$YC_LOCKBOX_SECRET_ID" \
      --version-id "$vid" --pending-period 0s &>/dev/null && DESTROYED=$((DESTROYED + 1)) || true
  done
  [ $DESTROYED -gt 0 ] && echo -e "${YELLOW}  Scheduled $DESTROYED old version(s) for destruction${NC}"
fi

echo -e "${GREEN}Done.${NC} $TOTAL keys synced, only latest version kept."

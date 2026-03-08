# Yandex Serverless Container - Astro SSR
# Pre-built dist/ is copied in; run `pnpm build` before `docker build`

FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

COPY dist ./dist

RUN if [ ! -d "dist/server" ]; then \
      echo "Error: dist/server not found. Run 'pnpm build' before 'docker build'"; \
      exit 1; \
    fi

ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]

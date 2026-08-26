FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json tsconfig.client.json vite.config.ts index.html ./
COPY src/ src/
COPY config/ config/
COPY datos/ datos/

RUN npx tsc \
 && npx vite build \
 && mkdir -p dist/src/servidor/db/migraciones \
 && cp src/servidor/db/migraciones/*.sql dist/src/servidor/db/migraciones/

FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/ dist/
COPY config/ config/
COPY datos/ datos/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/servidor/index.js"]

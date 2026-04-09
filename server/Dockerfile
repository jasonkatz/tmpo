FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY schema.yaml schema.yaml
COPY src/ src/
RUN bunx openapi-typescript schema.yaml -o src/types/api.ts && \
    bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist/ dist/
COPY migrations/ migrations/
COPY schema.yaml schema.yaml
COPY docker-entrypoint.sh docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p /data && chown bun:bun /data

USER bun

EXPOSE 8080
ENTRYPOINT ["./docker-entrypoint.sh"]

FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY schema.yaml schema.yaml
COPY src/ src/
RUN bunx openapi-typescript schema.yaml -o src/types/api.ts && \
    bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist/ dist/
COPY migrations/ migrations/
COPY schema.yaml schema.yaml

USER bun

EXPOSE 8080
CMD ["bun", "dist/index.js"]

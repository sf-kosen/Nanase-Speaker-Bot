FROM oven/bun:1-slim AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build


FROM oven/bun:1-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/build ./build
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER bun

CMD ["bun", "-r", "tsconfig-paths/register", "./build/index.js"]
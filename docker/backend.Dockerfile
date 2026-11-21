# syntax=docker/dockerfile:1
# Backend NestJS. Build context: ./backend (xem docker-compose.yml).
FROM node:26.10.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:26.10.0-alpine
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3001
# GET / không cần khóa cổng (kiểm tra sống).
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/ || exit 1
CMD ["node", "dist/main"]

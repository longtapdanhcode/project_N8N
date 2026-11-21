# syntax=docker/dockerfile:1
# Cổng 3000: Next.js (giảng viên) + PWA sinh viên tại /student. Build context: thư mục gốc repo.
FROM node:26.10.0-alpine AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY front/package.json front/package-lock.json front/
COPY student-pwa/package.json student-pwa/package-lock.json student-pwa/
RUN npm ci --prefix front && npm ci --prefix student-pwa
COPY package.json ./
COPY scripts/portal.mjs scripts/
COPY front front
COPY student-pwa student-pwa
# Build PWA, chép vào front/public/student rồi next build (bản standalone gọn nhẹ).
RUN NEXT_OUTPUT=standalone node scripts/portal.mjs build

FROM node:26.10.0-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/front/.next/standalone ./
COPY --from=build --chown=node:node /repo/front/.next/static ./front/.next/static
COPY --from=build --chown=node:node /repo/front/public ./front/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
# Thiếu AUTH_SESSION_SECRET hoặc PORTAL_API_KEY thì máy chủ tự dừng (front/instrumentation.ts).
CMD ["node", "front/server.js"]

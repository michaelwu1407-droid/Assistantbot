FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

ENV NODE_ENV=production
ENV LIVEKIT_HTTP_HOST=127.0.0.1
ENV VOICE_WORKER_HEALTH_STALE_MS=180000

CMD ["npm", "run", "start"]

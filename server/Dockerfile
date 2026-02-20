FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./

# Reliable npm install on low-memory VPS: longer timeout, skip optional deps, limit memory
ENV NODE_OPTIONS=--max-old-space-size=512
RUN npm config set fetch-timeout 120000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --omit=dev --no-optional

COPY . .

RUN mkdir -p /app/downloads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "index.js"]

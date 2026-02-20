FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

COPY package.json package-lock.json ./

# Reproducible install from lockfile (avoids resolution failures on VPS)
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/downloads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "index.js"]

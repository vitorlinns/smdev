FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 1025 8025

CMD ["node", "src/index.js"]

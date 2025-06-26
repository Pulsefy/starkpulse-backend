# Dockerfile
FROM node:20.12.2-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN apk update && apk upgrade && npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20.12.2-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN apk update && apk upgrade && npm ci --omit=dev

CMD ["node", "dist/main"]

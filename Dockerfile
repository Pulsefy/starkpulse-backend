# Stage 1: Build
FROM node:18-alpine3.19 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine3.19 AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"] 
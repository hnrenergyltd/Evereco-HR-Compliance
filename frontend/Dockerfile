# Build stage
FROM node:20.17.0 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage: serves dist/ and relays /api to the backend (see server.js).
FROM node:20.17.0-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js ./
# Railway reads EXPOSE to pick the port its edge proxy forwards to, so this must
# match the port server.js listens on (PORT, else 8080).
EXPOSE 8080
CMD ["node", "server.js"]

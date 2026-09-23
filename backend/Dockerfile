# Both stages pin the same Debian release so the sqlite3 native addon is linked
# against the glibc that will actually load it. Leaving the image unpinned let
# the builder resolve to a newer Node than the runtime, and sqlite3 then failed
# at require() with "GLIBC_2.38 not found".
FROM node:20.17.0-bookworm AS builder
WORKDIR /app
COPY package*.json ./
# Compile sqlite3 here instead of fetching a prebuilt binary: the published
# prebuilds target a newer glibc than bookworm ships.
ENV npm_config_build_from_source=true
RUN npm install --omit=dev

FROM node:20.17.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
# Railway supplies PORT and routes public traffic to whatever EXPOSE names.
EXPOSE 8080
CMD ["node", "src/server.js"]

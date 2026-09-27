# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

FROM node:22-alpine AS server-dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=server-dependencies --chown=node:node /app/server/node_modules ./server/node_modules
COPY --from=server-build --chown=node:node /app/server/dist ./server/dist
COPY --from=server-build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=client-build --chown=node:node /app/client/dist ./client/dist

USER node
EXPOSE 3001

CMD ["node", "server/dist/server.js"]

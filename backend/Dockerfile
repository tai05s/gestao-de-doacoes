FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]

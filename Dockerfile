FROM node:20-alpine
WORKDIR /app

# Dépendances
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Code source
COPY server/ ./server/
COPY frontend/ ./frontend/

EXPOSE 3001
CMD ["node", "server/index.js"]

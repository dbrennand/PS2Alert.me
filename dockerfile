FROM node:16-alpine

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node backend/ ./backend
COPY --chown=node:node frontend/ ./frontend

EXPOSE 8080

USER node

CMD ["node", "backend/index.js"]

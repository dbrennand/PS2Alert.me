FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy and install PS2Alert.me dependencies
COPY package*.json ./
RUN npm install

# Copy PS2Alert.me source code
COPY backend/ ./backend
COPY frontend/ ./frontend

EXPOSE 8080

CMD ["node", "backend/index.js"]

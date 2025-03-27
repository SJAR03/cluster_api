FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
WORKDIR /app/src

CMD ["node", "server.js"]
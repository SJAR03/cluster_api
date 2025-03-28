FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
WORKDIR /app/src

CMD ["node", "server.js"]
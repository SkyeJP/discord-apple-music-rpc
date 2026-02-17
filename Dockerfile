FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY presence.js .
STOPSIGNAL SIGINT
CMD ["node", "presence.js"]

FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY encoder/package*.json ./
RUN npm install
COPY encoder/ ./

CMD ["npm", "run", "start"]

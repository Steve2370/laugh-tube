FROM node:20-alpine

RUN apk add --no-cache ffmpeg \
     && ffmpeg -version

 RUN mkdir -p /app/uploads/videos \
              /app/uploads/encoded \
              /app/uploads/thumbnails

 WORKDIR /app

 COPY package*.json ./
 RUN npm install

 COPY . .

 CMD ["npm", "start"]
FROM node:20-alpine AS node

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "sh", "-c", "npm run seed && npm run start:dev" ]

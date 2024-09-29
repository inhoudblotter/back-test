FROM node:lts-alpine

WORKDIR /app
COPY ./ /app/

RUN apk update
RUN npm install

RUN npm run build

CMD ["npm", "run", "start:prod"];



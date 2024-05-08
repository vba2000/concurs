FROM node:18.13-alpine

WORKDIR /concurs

COPY . /concurs

RUN npm ci

CMD ["npm", "start"]
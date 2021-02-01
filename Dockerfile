FROM node:alpine as builder

WORKDIR /src

COPY . /src

RUN ["npm", "install", "-D"]

RUN ["npm", "run", "build"]


FROM node:alpine

WORKDIR /app

COPY package*.json .

RUN ["npm", "ci"]

COPY --from=builder /src/dist .

CMD [ "npm","start:bot" ]
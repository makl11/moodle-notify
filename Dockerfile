FROM node:current-alpine
WORKDIR /home/node/app
COPY ./package.json /home/node/app
RUN npm install
COPY dist/* /home/node/app
COPY ./cronscript.sh /etc/periodic/15min/
CMD [ "npm", "start" ]
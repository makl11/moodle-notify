FROM node:current-alpine
ENV MOODLE_NOTIFY_DEBUG=0
ENV MOODLE_NOTIFY_USERNAME=
ENV MOODLE_NOTIFY_PASSWORD=
ENV MOODLE_NOTIFY_TELEGRAM_TOKEN=
ENV MOODLE_NOTIFY_SELENIUM_SERVER=
ENV SELENIUM_REMOTE_URL=http://localhost:4444
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
COPY cronscript.sh /etc/periodic/15min/
CMD [ "npm", "run", "start:bot" ]

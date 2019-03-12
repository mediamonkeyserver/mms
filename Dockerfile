FROM node:8

# Create app directory
WORKDIR /usr/src/mms

COPY *.json ./
COPY *.js ./
COPY lib ./lib
COPY build-webui ./build-webui
COPY icon ./icon

RUN npm install
EXPOSE 10222
CMD [ "npm", "start" ]
FROM node:20-alpine

WORKDIR /node-sharp
COPY package.json /node-sharp


#COPY package*.json /home/node/app

#USER node
#
RUN npm install

COPY --chown=node:node ../.. .
#
EXPOSE 3000
#
CMD [ "node", "index.js" ]

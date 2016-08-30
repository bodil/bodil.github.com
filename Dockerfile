FROM mhart/alpine-node:6

WORKDIR /src
ADD . .
ENV NODE_ENV=production
RUN npm install
RUN npm run compile
CMD ["npm", "start"]

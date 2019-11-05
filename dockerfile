FROM node:13-alpine as base

RUN npm config set unsafe-perm true

RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib


FROM base as builder

RUN apk --update add --virtual build-dependencies python make gcc g++  \
 && npm install -g node-gyp

RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /chart-server

COPY package*.json ./

RUN npm install --ci --ignore-optional --production=true --non-interactive

FROM builder as compiler

RUN npm install --ci --ignore-optional --non-interactive

COPY tsconfig*.json ./
COPY test/** ./test/
COPY src/** ./src/

RUN npm test

RUN npm run tsc

FROM base as runtime

RUN apk add --no-cache \
    ttf-freefont

WORKDIR /chart-server

COPY --from=builder /chart-server/ .
COPY --from=compiler /chart-server/out ./out/

COPY assets/* ./assets/
COPY example/chart-*json ./example/


#ENV PORT 33456
#ENV HOST 0.0.0.0

EXPOSE 3456

CMD node --icu-data-dir=node_modules/full-icu out/index.js || sleep 1800

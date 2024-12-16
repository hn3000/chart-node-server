FROM node:14-alpine3.13 AS base

RUN npm config set unsafe-perm true

RUN apk add --no-cache cairo jpeg pango giflib

FROM base AS builder

RUN apk --update add --virtual build-dependencies python3 make gcc g++ \
 && npm install -g node-gyp

RUN apk add --no-cache cairo-dev jpeg-dev pango-dev giflib-dev

WORKDIR /chart-server

COPY package*.json ./

RUN npm install --ci --ignore-optional --production=true --non-interactive

FROM builder AS compiler

RUN npm install --ci --ignore-optional --non-interactive

COPY tsconfig*.json ./
COPY test/** ./test/
COPY src/** ./src/

RUN npm test

RUN npm run tsc

FROM base AS runtime

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

CMD node --icu-data-dir=node_modules/full-icu out/index.js

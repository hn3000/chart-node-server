FROM node:20-alpine AS base

# RUN npm config set unsafe-perm true

RUN apk add --no-cache cairo jpeg pango giflib

FROM base AS runtime

RUN apk --update add --virtual build-dependencies python3 make gcc g++ \
 && npm install -g node-gyp

RUN apk add --no-cache cairo-dev jpeg-dev pango-dev giflib-dev

WORKDIR /chart-server

COPY package*.json ./

RUN npm install --ci --ignore-optional --omit=dev --non-interactive || sleep 3600 || return -1

FROM runtime as compiler

RUN npm install --ci --ignore-optional --non-interactive || sleep 3600

COPY tsconfig*.json ./
COPY test/** ./test/
COPY src/** ./src/

RUN npm test

RUN npm run tsc

FROM base as run

RUN apk add --no-cache \
    ttf-freefont

WORKDIR /chart-server

COPY --from=runtime /chart-server/ .
COPY --from=compiler /chart-server/out ./out/

COPY assets/* ./assets/
COPY example/chart-*json ./example/


#ENV PORT 33456
#ENV HOST 0.0.0.0

EXPOSE 3456
EXPOSE 3457

CMD node --icu-data-dir=node_modules/full-icu out/index.js

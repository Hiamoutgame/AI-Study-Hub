# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM base AS final
ENV NODE_ENV=production

COPY package.json .
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/src ./src

RUN mkdir -p uploads/avatars uploads/documents && chown -R node:node /usr/src/app/uploads
USER node

EXPOSE 5284

CMD ["npm", "start"]

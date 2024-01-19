#FROM node:16 as base
FROM node:18.17.1 as base

# Create app directory
RUN mkdir -p /opt/app
WORKDIR /opt/app

# Install app dependencies
COPY ./package.json package-lock.json ./
RUN npm ci

# Bundle frontend
COPY src ./src
COPY assets ./assets
COPY config ./config
RUN npm run build

#####################
# Final image
#####################

#FROM node:16-alpine
FROM node:18.17.1-alpine

ENV NODE_ENV=prod

#MAINTAINER cracker0dks
LABEL maintainer="mohini402"

# Create app directory
RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY ./package.json ./package-lock.json config.default.yml ./
RUN npm ci --only=prod

COPY scripts ./scripts
COPY --from=base /opt/app/dist ./dist

# Set a non-root user for security
USER node

EXPOSE 8080
ENTRYPOINT ["npm", "run", "start"]
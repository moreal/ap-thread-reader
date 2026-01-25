FROM node:24-slim
WORKDIR /app

# Corepack 활성화 (Yarn 4)
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY . .
RUN yarn build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

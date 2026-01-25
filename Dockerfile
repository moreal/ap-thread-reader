FROM node:24-slim
WORKDIR /app

# Corepack 활성화 (Yarn 4)
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

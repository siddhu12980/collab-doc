FROM node:18-alpine

WORKDIR /app

RUN npm install -g turbo

RUN npm install -g ts-node 

RUN npm install -g typescript

RUN npm install -g nodemon

RUN npm install -g serve

COPY package.json package-lock.json turbo.json ./
COPY apps/http-server/package.json ./apps/http-server/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/ws-server/package.json ./apps/ws-server/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/

RUN npm ci

COPY . .

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

EXPOSE 3000 8081 5173 5174

CMD ["npm", "run", "dev"]
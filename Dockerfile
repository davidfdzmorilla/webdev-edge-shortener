FROM node:22-slim AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --ignore-scripts --frozen-lockfile 2>/dev/null || pnpm install --ignore-scripts

FROM node:22-slim AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3014
CMD ["npx", "tsx", "src/server.ts"]

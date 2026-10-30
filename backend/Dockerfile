# Imagem da API do Observatório do Turismo
# Build:  docker build -t observatorio-api ./backend
# Local (API + MySQL juntos): docker compose --profile completo up -d --build   (na raiz)
FROM node:22-slim

# O Prisma precisa do OpenSSL para rodar as migrations
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Dependências primeiro: o Docker reaproveita esta camada enquanto o package-lock não mudar
COPY package.json package-lock.json ./
RUN npm ci

# 2) Código, Prisma Client e compilação do TypeScript para dist/
COPY . .
# O prisma.config.ts exige DATABASE_URL, mas o generate não conecta no banco:
# uma URL de mentira só para esta etapa (a real vem das variáveis do deploy).
RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npx prisma generate \
  && npm run build

ENV NODE_ENV=production \
    PORT=3333 \
    UPLOADS_DIR=/app/uploads

# Roda como usuário comum (não root) por segurança
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3333

# O Docker (e a plataforma de deploy) consulta esta rota para saber se a API está de pé
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3333) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Aplica as migrations pendentes e só então sobe a API (ver docker-entrypoint.sh)
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]

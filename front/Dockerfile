# Imagem do front-end (Next.js) do Observatório do Turismo
# Local (MySQL + API + front juntos): docker compose --profile completo up -d --build   (na raiz)

# 1) Dependências: o Docker reaproveita esta camada enquanto o package-lock não mudar
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build de produção
FROM deps AS build
COPY . .
# Endereço da API que o NAVEGADOR vai chamar. No Next.js, variáveis NEXT_PUBLIC_ entram no
# código no momento do build, por isso vêm como argumento de build (veja o docker-compose.yml).
ARG NEXT_PUBLIC_API_URL=http://localhost:3333/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Imagem final: só o servidor "standalone" que o build gera, sem as dependências de desenvolvimento
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Roda como usuário comum (não root) por segurança
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000)).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]

#!/bin/sh
# Executado toda vez que o container da API inicia.
set -e

# 1) Aplica as migrations que ainda não rodaram neste banco.
#    "migrate deploy" só APLICA migrations já criadas (pasta prisma/migrations):
#    nunca apaga dados nem cria migrations novas. Por isso é o único comando
#    de migration que deve rodar em produção (nunca "migrate dev" ou "migrate reset").
#    Tenta algumas vezes porque o banco pode demorar a aceitar conexões no início.
tentativa=1
until npx prisma migrate deploy; do
  if [ "$tentativa" -ge 10 ]; then
    echo "O banco não respondeu depois de 10 tentativas. Confira a DATABASE_URL."
    exit 1
  fi
  echo "Banco ainda indisponível (tentativa $tentativa de 10). Tentando de novo em 3 s..."
  tentativa=$((tentativa + 1))
  sleep 3
done

# 2) Dados de exemplo: só quando RODAR_SEED=true (ex.: primeira subida da demonstração).
#    O seed não duplica nada se rodar de novo.
if [ "$RODAR_SEED" = "true" ]; then
  echo "RODAR_SEED=true: criando o admin e os dados de exemplo..."
  npx prisma db seed
fi

# 3) Sobe a API (JavaScript compilado em dist/). O "exec" faz a API receber
#    direto os sinais de desligamento do Docker (SIGTERM).
exec node dist/server.js

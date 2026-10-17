# C317
New Project Tópicos Especiais I - Plataforma Web

## Rodando o banco com Docker (opcional)

Se você não tem MySQL instalado, dá para subir o banco com Docker. Precisa do Docker Desktop aberto.

```bash
docker compose up -d      # liga o MySQL (usuário root, senha root, banco observatorio)
docker compose ps         # espere aparecer "healthy"
```

Depois siga normalmente o passo a passo do backend (`backend/README.md`): copie o `.env.example` para `.env`, rode `npm install`, `npx prisma migrate deploy`, `npx prisma generate`, `npx prisma db seed` e `npm run dev`.

| Para | Comando |
|---|---|
| Desligar o banco | `docker compose down` |
| Apagar os dados e começar do zero | `docker compose down -v` |

> Se der erro de porta 3306 ocupada, já existe outro MySQL rodando na sua máquina. Desligue ele ou use o seu MySQL em vez do Docker.
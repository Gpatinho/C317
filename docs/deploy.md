# Deploy — colocando o Observatório no ar

O projeto já está preparado para produção: a API roda num **container Docker**, aplica as
migrations sozinha ao iniciar e guarda os PDFs numa pasta que pode ser um volume persistente.
Este guia mostra como publicar. O pipeline de CI/CD (GitHub Actions) é outra tarefa da equipe e
pode chamar estes mesmos passos.

## Como fica em produção

| Parte | Onde roda | Observação |
|---|---|---|
| Front-end (Next.js) | **Vercel** | Gratuito para projetos pessoais; deploy direto do GitHub |
| API (container Docker) | **Railway** (ou Render, Fly.io) | Usa o `backend/Dockerfile` |
| Banco MySQL | No mesmo serviço da API (ex.: MySQL do Railway) | Banco gerenciado, com dados persistentes |
| PDFs dos relatórios | **Volume** montado em `/app/uploads` | Sem volume, os PDFs somem a cada deploy |

> Planos e limites gratuitos dessas plataformas mudam com frequência. Confira os valores atuais
> antes de criar a conta e evite cadastrar cartão se não for necessário.

## Variáveis de ambiente da API

| Variável | Obrigatória | Valor |
|---|---|---|
| `DATABASE_URL` | Sim | URL do MySQL de produção: `mysql://usuario:senha@host:3306/banco` |
| `JWT_SECRET` | Sim | Segredo **novo**, com pelo menos 32 caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Com `NODE_ENV=production` (padrão da imagem), a API **não sobe** com um segredo fraco |
| `FRONTEND_URL` | Sim | Endereço do front na Vercel, ex.: `https://observatorio-srs.vercel.app` (vários separados por vírgula) |
| `UPLOADS_DIR` | Não | Já é `/app/uploads` na imagem; só mude se o volume estiver em outro caminho |
| `PORT` | Não | `3333` na imagem; algumas plataformas definem sozinhas |
| `RODAR_SEED` | Não | `true` só na **primeira** subida, para criar o admin e os dados de exemplo; depois remova |
| `ADMIN_EMAIL`, `ADMIN_SENHA`, `ADMIN_NOME` | Não | Usuário criado pelo seed. **Troque a senha padrão** antes do primeiro deploy |

Nunca coloque essas variáveis no código ou no GitHub: elas ficam só no painel da plataforma.

## Passo a passo (Railway + Vercel)

### 1. API e banco

1. Crie um projeto no Railway a partir do repositório do GitHub.
2. No serviço da API, defina o **Root Directory** como `backend`. O Railway detecta o `Dockerfile`.
3. Adicione um banco **MySQL** ao projeto. O Railway mostra a URL de conexão (normalmente na
   variável `MYSQL_URL`); use-a como `DATABASE_URL` da API.
4. Preencha as variáveis da tabela acima (`JWT_SECRET` novo, `FRONTEND_URL`, `RODAR_SEED=true`).
5. Crie um **Volume** no serviço da API, montado em `/app/uploads`.
   Se ao publicar um PDF aparecer erro de permissão, a plataforma montou o volume como root:
   consulte a documentação dela sobre volumes com usuário não root.
6. Gere um domínio público para a API e teste: `https://<dominio-da-api>/api/health` deve
   responder `{"status":"online"}`.
7. Depois que funcionar, **remova** `RODAR_SEED` e faça um novo deploy.

### 2. Front-end

1. Na Vercel, importe o repositório e defina o **Root Directory** como `front`.
2. Adicione a variável `NEXT_PUBLIC_API_URL=https://<dominio-da-api>/api`.
3. Faça o deploy e copie o endereço gerado.
4. Volte à API e coloque esse endereço em `FRONTEND_URL` (é o que libera o CORS).

### 3. Conferir

- [ ] `/api/health` responde `{"status":"online"}`
- [ ] A Home e o dashboard mostram os números
- [ ] O login funciona com o admin (e a senha padrão foi trocada)
- [ ] Publicar um PDF, fazer um novo deploy da API e o PDF continuar baixando (prova que o volume funciona)

## Migrations em produção

O container roda `npx prisma migrate deploy` toda vez que inicia (`backend/docker-entrypoint.sh`):

- Ele **só aplica** migrations que já existem em `backend/prisma/migrations` e ainda não rodaram
  naquele banco. Não apaga dados e não cria migrations.
- Se o banco ainda não estiver pronto, tenta de novo até 10 vezes antes de desistir.
- Se uma migration falhar, a API **não sobe**, em vez de rodar com o banco pela metade.

**Nunca** rode `prisma migrate dev` ou `prisma migrate reset` contra o banco de produção: o
`reset` apaga tudo.

Fluxo para mudar o banco:

1. Altere o `schema.prisma` e rode `npx prisma migrate dev --name descricao` **localmente**.
2. Commite a pasta nova em `prisma/migrations` junto com o código e abra o PR.
3. Depois do merge, o próximo deploy aplica a migration sozinho.

## PDFs dos relatórios

- Ficam na pasta `UPLOADS_DIR` (`/app/uploads` no container). O banco guarda só o nome do arquivo.
- Sem um volume, essa pasta é apagada a cada novo deploy e os downloads passam a responder
  `410 – O arquivo deste relatório não está mais disponível`.
- Backup: além do backup do MySQL (que a plataforma costuma oferecer), copie de tempos em tempos a
  pasta de uploads. Os dois juntos são necessários para restaurar os relatórios.

## Testar a imagem localmente antes do deploy

Na raiz do projeto, com o Docker Desktop aberto:

```bash
docker compose --profile completo up -d --build
docker compose --profile completo ps  # mysql e api "healthy"
curl http://localhost:3333/api/health
```

Isso sobe o MySQL e a **API em container**, exatamente como em produção (migrations automáticas,
seed de exemplo, PDFs num volume). Para desligar: `docker compose --profile completo down`.
O front continua rodando com `npm run dev` na pasta `front`.

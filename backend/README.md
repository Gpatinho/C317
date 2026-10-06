# Back-end — Observatório do Turismo de Santa Rita do Sapucaí

API REST do projeto C317 (Inatel · HEIComp 2026.2). Stack definida no Milestone II:
**Node.js + Express 5 + Prisma 7 + MySQL 8**, escrita em TypeScript.

## Como rodar (primeira vez)

Pré-requisitos: Node 22+ e MySQL 8 rodando (porta 3306).

```bash
cd backend
npm install

# 1. Configuração
cp .env.example .env          # no Windows: copy .env.example .env
# edite o .env: senha do MySQL e JWT_SECRET

# 2. Crie o banco vazio (uma vez só), pelo Workbench ou terminal:
#    CREATE DATABASE observatorio;

# 3. Cria as tabelas e gera o Prisma Client
npx prisma migrate dev
npm run db:generate

# 4. Popula com o admin e dados FICTÍCIOS de exemplo
npm run db:seed

# 5. Sobe a API em http://localhost:3333/api
npm run dev
```

Login de teste: `admin@observatorio.local` / `admin123` (mude no `.env` antes do seed).

> **Depois de um `git pull` que mexeu no `schema.prisma`**, rode `npx prisma migrate dev` de novo.
> Se aparecer erro de import em `src/generated/prisma`, rode `npm run db:generate`.

Para testar as rotas sem o front, use o arquivo `requests.http` com a extensão **REST Client** do VS Code.
Para ver/editar o banco visualmente: `npm run db:studio`.

## Estrutura

```
backend/
├── prisma/
│   ├── schema.prisma        # modelo de dados (Milestone III)
│   └── seed.ts              # admin + dados fictícios
├── prisma.config.ts         # config do Prisma 7 (URL do banco, seed)
├── src/
│   ├── server.ts            # sobe o servidor
│   ├── app.ts               # Express: middlewares e rotas
│   ├── routes/              # uma rota por recurso
│   ├── middlewares/         # autenticação JWT e tratamento de erros
│   ├── schemas/             # validação das entradas (Zod)
│   └── lib/                 # prisma, env, datas e cálculos do dashboard
├── uploads/                 # PDFs dos relatórios (fora do git)
└── requests.http            # exemplos de requisições
```

## Rotas

🔒 = exige `Authorization: Bearer <token>` (painel administrativo).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status da API |
| POST | `/api/auth/login` | `{ email, senha }` → `{ token, usuario }` |
| GET 🔒 | `/api/auth/me` | Usuário logado |
| GET | `/api/indicadores?categoria=` | Lista indicadores |
| GET | `/api/indicadores/categorias` | Setores para os filtros do front |
| POST/PUT/DELETE 🔒 | `/api/indicadores[/:id]` | Gerencia indicadores |
| GET | `/api/registros?indicadorId=&categoria=&inicio=&fim=` | Valores lançados |
| POST/PUT/DELETE 🔒 | `/api/registros[/:id]` | `{ indicadorId, valor, periodo: "2026-03", estabelecimentoId? }` |
| GET | `/api/dashboard/resumo?inicio=&fim=&categoria=` | Cards: valor do período + variação % vs mesmo período do ano anterior |
| GET | `/api/dashboard/serie?indicadorId=&inicio=&fim=` | Série mensal para o gráfico |
| GET | `/api/estabelecimentos` | Lista estabelecimentos |
| POST/PUT/DELETE 🔒 | `/api/estabelecimentos[/:id]` | Gerencia estabelecimentos |
| GET | `/api/relatorios?ano=` | Relatórios públicos |
| GET | `/api/relatorios/:id/download` | Baixa o PDF (`?inline=1` abre no navegador) |
| POST 🔒 | `/api/relatorios` | `multipart/form-data`: `arquivo` (PDF, até 20 MB), `titulo`, `descricao?`, `ano?` |
| PUT/DELETE 🔒 | `/api/relatorios/:id` | Edita / remove (apaga o arquivo também) |

Datas de período sempre no formato `AAAA-MM`. Sem `inicio`/`fim`, o dashboard usa janeiro do ano atual até o mês atual.

Erros sempre voltam como `{ "erro": "mensagem" }` (e `detalhes` em erros de validação), com status 400, 401, 403, 404 ou 409.

## Decisões de modelagem

O modelo segue o Milestone III, com as cinco tabelas: `usuario`, `indicador`, `estabelecimento`, `registro_indicador` e `relatorio`.

- **`registro_indicador.estabelecimento_id` é opcional.** Hoje o Observatório trabalha com números consolidados do município (ex.: total de visitantes), que não pertencem a um hotel. `NULL` significa "valor do município". Isso já deixa pronto o caminho para a fase 2 (coleta pelos próprios estabelecimentos).
- **Campo `agregacao` no indicador.** Nem todo indicador se soma: visitantes de jan a set é a soma dos meses (`SOMA`), mas leitos é o número do mês mais recente (`ULTIMO`) e ocupação é a média (`MEDIA`). O dashboard usa esse campo para calcular os cards corretamente.
- **Um valor por indicador/mês/estabelecimento.** A API recusa duplicados (409) e pede para editar o existente.
- **`periodo` é sempre o dia 1 do mês**, pois os dados do Observatório são mensais.
- **A variação % do dashboard compara com o mesmo período do ano anterior** (jan–set/2026 vs jan–set/2025), porque o turismo é sazonal. Cada card considera só os meses que têm lançamento: se o período pedido vai até outubro e o último dado é de setembro, o card usa jan–set dos dois anos. Assim, um mês ainda não lançado não conta como zero. Os meses usados voltam em `card.periodo` e `card.periodoAnterior` (`null` quando não há dados para comparar).

## Deploy (Render/Railway)

- Configure as mesmas variáveis do `.env` no painel do serviço.
- Build: `npm install && npx prisma generate && npx prisma migrate deploy`; start: `npm start`.
- Atenção: no plano gratuito do Render o disco é apagado a cada deploy, então os PDFs de `uploads/` somem. Para a apresentação final, vale usar um disco persistente ou um storage externo.

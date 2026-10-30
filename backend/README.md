# Back-end — Observatório do Turismo de Santa Rita do Sapucaí

API REST do projeto C317 (Inatel · HEIComp 2026.2). Stack definida no Milestone II:
**Node.js + Express 5 + Prisma 7 + MySQL 8**, escrita em TypeScript.

## Como rodar (primeira vez)

Pré-requisitos: Node 22+ e MySQL 8 rodando (porta 3306). Sem MySQL instalado, suba o banco com Docker: veja o README da raiz.

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
npx prisma generate

# 4. Popula com o admin e dados FICTÍCIOS de exemplo
npm run db:seed

# 5. Sobe a API em http://localhost:3333/api
npm run dev
```

Login de teste: `admin@observatorio.local` / `admin123` (mude no `.env` antes do seed).

> **Depois de um `git pull` que mexeu no `schema.prisma`**, rode `npx prisma migrate dev` e em seguida `npx prisma generate`.
> No Prisma 7 o `migrate dev` **não** regera o client sozinho: sem o `generate`, o TypeScript acusa que tabelas e campos novos "não existem".

Para testar as rotas sem o front, use o arquivo `requests.http` com a extensão **REST Client** do VS Code.
Para ver/editar o banco visualmente: `npm run db:studio`.

## Estrutura

```
backend/
├── prisma/
│   ├── schema.prisma        # modelo de dados (Milestone III + fase 2)
│   ├── migrations/          # histórico de alterações do banco (vai para o git)
│   └── seed.ts              # admin + dados fictícios
├── prisma.config.ts         # config do Prisma 7 (URL do banco, seed)
├── src/
│   ├── server.ts            # sobe o servidor
│   ├── app.ts               # Express: middlewares e rotas
│   ├── routes/              # uma rota por recurso
│   ├── middlewares/         # autenticação JWT, permissões e tratamento de erros
│   ├── schemas/             # validação das entradas (Zod)
│   └── lib/                 # prisma, env, datas, cálculos do dashboard e códigos de acesso
├── uploads/                 # PDFs dos relatórios (fora do git)
└── requests.http            # exemplos de requisições
```

## Rotas

🔒 = exige `Authorization: Bearer <token>` (painel administrativo).
👑 = só ADMIN. Todo `DELETE` também é só ADMIN; o EDITOR lança, edita e analisa envios.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status da API |
| POST | `/api/auth/login` | `{ email, senha }` → `{ token, usuario }` |
| GET 🔒 | `/api/auth/me` | Usuário logado |
| PUT 🔒 | `/api/auth/senha` | `{ senhaAtual, novaSenha }` → troca a própria senha (204) |
| GET | `/api/indicadores?categoria=` | Lista indicadores |
| GET | `/api/indicadores/categorias` | Setores para os filtros do front |
| POST/PUT/DELETE 🔒 | `/api/indicadores[/:id]` | Gerencia indicadores |
| GET | `/api/registros?indicadorId=&categoria=&inicio=&fim=` | Valores lançados |
| POST/PUT/DELETE 🔒 | `/api/registros[/:id]` | `{ indicadorId, valor, periodo: "2026-03", estabelecimentoId? }` |
| GET | `/api/dashboard/resumo?inicio=&fim=&categoria=` | Cards: valor do período + variação % vs mesmo período do ano anterior |
| GET | `/api/dashboard/serie?indicadorId=&inicio=&fim=` | Série mensal para o gráfico |
| GET | `/api/estabelecimentos` | Lista estabelecimentos (`temCodigo` diz se já tem código de acesso) |
| POST/PUT/DELETE 🔒 | `/api/estabelecimentos[/:id]` | Gerencia estabelecimentos (não apaga se tiver valores publicados) |
| POST 🔒👑 | `/api/estabelecimentos/:id/codigo` | Gera o código de acesso da coleta (aparece só nesta resposta) |
| GET | `/api/relatorios?ano=` | Relatórios públicos |
| GET | `/api/relatorios/:id/download` | Baixa o PDF (`?inline=1` abre no navegador) |
| POST 🔒 | `/api/relatorios` | `multipart/form-data`: `arquivo` (PDF, até 20 MB), `titulo`, `descricao?`, `ano?` |
| PUT/DELETE 🔒 | `/api/relatorios/:id` | Edita / remove (apaga o arquivo também) |
| GET | `/api/eventos?futuros=true&limite=4` | Agenda de eventos |
| POST/PUT/DELETE 🔒 | `/api/eventos[/:id]` | Gerencia eventos (`dataInicio`/`dataFim` em `AAAA-MM-DD`) |
| GET | `/api/atrativos?tipo=&categoria=` | Inventário turístico (`tipo`: ATRATIVO, EQUIPAMENTO, SERVICO) |
| GET | `/api/atrativos/categorias?tipo=` | Categorias do inventário |
| GET 🔒 | `/api/atrativos/revisao-pendente` | Itens sem revisão há mais de 12 meses |
| POST/PUT/DELETE 🔒 | `/api/atrativos[/:id]` | Gerencia o inventário (editar conta como revisão) |
| POST 🔒 | `/api/atrativos/:id/revisar` | Marca o item como conferido hoje |
| GET/POST/PUT/DELETE 🔒👑 | `/api/usuarios[/:id]` | Gestão de usuários |
| POST | `/api/coleta/acesso` | `{ codigo }` → estabelecimento, indicadores liberados e últimos envios |
| POST | `/api/coleta/envios` | `{ codigo, indicadorId, valor, periodo, observacao? }` → envio PENDENTE |
| GET 🔒 | `/api/submissoes?status=&estabelecimentoId=` | Envios dos estabelecimentos |
| GET 🔒 | `/api/submissoes/contagem` | Quantos envios estão pendentes, aprovados e rejeitados |
| POST 🔒 | `/api/submissoes/:id/aprovar` | Publica o valor (cria o registro) |
| POST 🔒 | `/api/submissoes/:id/rejeitar` | `{ motivo }` → o estabelecimento vê o motivo e pode reenviar |

Datas de período sempre no formato AAAA-MM. Sem inicio/fim, o dashboard usa janeiro do ano atual até o mês atual.

Erros sempre voltam como { "erro": "mensagem" } (e detalhes em erros de validação), com status 400, 401, 403, 404 ou 409.

Nas edições (PUT), envie só os campos que mudaram: os demais continuam como estão.

## Decisões de modelagem

O modelo parte do Milestone III (usuario, indicador, estabelecimento, registro_indicador e relatorio) e ganhou na fase 2 as tabelas evento, atrativo (inventário turístico) e submissao (coleta pelos estabelecimentos).

- *registro_indicador.estabelecimento_id é opcional.* Hoje o Observatório trabalha com números consolidados do município (ex.: total de visitantes), que não pertencem a um hotel. NULL significa "valor do município".
- *Um estabelecimento com valores publicados não pode ser apagado* (onDelete: Restrict). Se a relação fosse SetNull, os valores dele virariam "valor do município" e distorceriam o dashboard.
- *Campo agregacao no indicador.* Nem todo indicador se soma: visitantes de jan a set é a soma dos meses (SOMA), mas leitos é o número do mês mais recente (ULTIMO) e ocupação é a média (MEDIA). O dashboard usa esse campo para calcular os cards corretamente.
- *Um valor por indicador/mês/estabelecimento.* A API recusa duplicados (409) e pede para editar o existente.
- *periodo é sempre o dia 1 do mês*, pois os dados do Observatório são mensais.
- *A variação % do dashboard compara com o mesmo período do ano anterior* (jan–set/2026 vs jan–set/2025), porque o turismo é sazonal. Cada card considera só os meses que têm lançamento: se o período pedido vai até outubro e o último dado é de setembro, o card usa jan–set dos dois anos. Assim, um mês ainda não lançado não conta como zero. Os meses usados voltam em card.periodo e card.periodoAnterior (null quando não há dados para comparar).
- *Validação de criar × editar.* Schemas com valores padrão (.default()) têm duas versões: a de criar aplica os padrões; a de editar não tem padrões. Usar .partial() no schema de criar faria o Zod 4 preencher os campos não enviados e sobrescrever dados na edição.

## Coleta pelos estabelecimentos (item 6 da proposta)

1. A SMCELT marca quais indicadores os estabelecimentos podem enviar (coletaEstabelecimento: true).
2. O ADMIN gera um código de acesso para cada estabelecimento. Só o hash SHA-256 vai para o banco, e ele nunca aparece nas respostas da API.
3. O estabelecimento envia o valor do mês com o código. O envio entra como PENDENTE em submissao.
4. A equipe aprova (cria o registro_indicador numa transação) ou rejeita com um motivo, que o estabelecimento vê e pode corrigir.
5. Só valores aprovados aparecem no dashboard. Se existir valor do município no mês, ele tem prioridade; senão, o dashboard combina os estabelecimentos (média para taxas, soma para o resto).

Códigos de teste criados pelo seed: CENT-2026 (hotel) e SERR-2026 (pousada).

## Segurança

- *Senhas* guardadas só como hash (bcrypt). *Códigos de acesso da coleta* guardados só como hash (SHA-256).
- *O token é conferido no banco a cada requisição.* Se um usuário for removido ou mudar de papel, o token antigo perde o acesso na hora, sem esperar as 8 horas de validade.
- *Limite de tentativas* (express-rate-limit): 10 erros de login ou 20 erros na coleta a cada 15 minutos, por IP. Os acertos não contam. A API confia no 1º proxy (trust proxy) para descobrir o IP real no Codespaces e no Render.
- *Todo DELETE é só ADMIN*, e a gestão de usuários também.

## Deploy (Render/Railway)

- Configure as mesmas variáveis do .env no painel do serviço.
- Build: npm install && npx prisma generate && npx prisma migrate deploy; start: npm start.
- Atenção: no plano gratuito do Render o disco é apagado a cada deploy, então os PDFs de uploads/ somem. Para a apresentação final, vale usar um disco persistente ou um storage externo.
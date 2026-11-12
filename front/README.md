# Front-end — Observatório do Turismo de Santa Rita do Sapucaí

Site público e painel administrativo do projeto, em **Next.js 16 (App Router) + React 19 +
Tailwind CSS 4**, escrito em TypeScript. Os dados vêm da API do `backend/`.

## Como rodar

Pré-requisitos: Node.js 22 LTS e a API rodando (veja o README da raiz).

```bash
cd front
cp .env.example .env.local    # no PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Para só ver o site funcionando, sem instalar nada além do Docker, use o comando único do README
da raiz (`docker compose --profile completo up -d --build`): ele monta este front pelo
`front/Dockerfile`.

O `.env.local` define onde está a API:

```
NEXT_PUBLIC_API_URL=http://localhost:3333/api
```

No GitHub Codespaces, use a URL da porta 3333 do Codespace (com a porta marcada como **Public**).
O Docker completo (`--profile completo`) não funciona no Codespaces. Veja o aviso no README da raiz.
Depois de mudar o `.env.local`, pare e rode `npm run dev` de novo.

## Telas

| Rota | Tela |
|---|---|
| `/` | Home |
| `/dashboard` | Indicadores em cards e gráfico, com filtros, e busca de lugares para conhecer |
| `/relatorios` | Relatórios públicos para download |
| `/lugares/[id]` | Página de um lugar do inventário: horários, melhor horário, época mais movimentada e Instagram (aberta pela busca do dashboard) |
| `/coleta` | Área do estabelecimento: o hotel ou pousada entra com o código de acesso e envia os dados do mês |
| `/cadastur` | O que são o Cadastur e a FNRH Digital, quem precisa se cadastrar e onde fazer |
| `/login` | Acesso da equipe da SMCELT |
| `/admin` | Visão geral do painel |
| `/admin/lancar` | Lançar, editar e excluir valores mensais |
| `/admin/publicar` | Publicar, editar e excluir relatórios em PDF |
| `/admin/indicadores` | Cadastro dos indicadores: criar, editar, ativar/desativar (some do dashboard sem perder os valores) e excluir (só administrador) |
| `/admin/envios` | Aprovar ou rejeitar os valores enviados pelos estabelecimentos |
| `/admin/estabelecimentos` | Cadastro dos estabelecimentos e geração do código de acesso da coleta |
| `/admin/eventos` | Agenda de eventos (próximos e já realizados); os próximos aparecem no dashboard |
| `/admin/inventario` | Cadastro dos lugares (horários, melhor horário, época, Instagram) e lembrete de revisão |
| `/admin/usuarios` | Gestão da equipe com acesso ao painel (só administrador) |
| `/admin/conta` | Minha conta: dados de quem está logado e troca da própria senha |

## Organização do código

```
front/
├── app/                      # uma pasta por rota (App Router)
│   ├── admin/
│   │   ├── layout.tsx        # menu lateral + verificação de login de todo o /admin
│   │   ├── _componentes/     # sessão, formatação, ícones e modal do painel (não são rotas)
│   │   ├── lancar/
│   │   └── publicar/
│   ├── dashboard/  relatorios/  login/
│   └── page.tsx              # Home
└── lib/api.ts                # todas as chamadas à API (tipos + funções)
```

- **Toda chamada à API passa por `lib/api.ts`.** Uma tela nova acrescenta ali a função da rota que usa.
- **Erros da API** chegam como `ApiError`, com o `status` HTTP. Um `401` no painel chama `sessaoExpirou()`,
  que leva ao login com o aviso de sessão expirada.
- **Telas do painel** ficam dentro de `app/admin/` e já recebem o menu e o usuário logado pelo
  `layout.tsx` (use `useSessao()`).
- As rotas que cada tela pendente vai usar estão em `docs/guia-api-front.md`.

## Testes

Feitos com **Vitest**, ficam em `tests/` e cobrem as funções puras do front, como as de
`app/admin/_componentes/formato.ts` (ler "29.600" e "83,5", formatar meses e valores).
Não precisam da API nem do banco.

| Comando | O que faz |
|---|---|
| `npm test` | Roda todos os testes uma vez (é o que o CI roda em todo PR) |
| `npm run test:watch` | Roda de novo a cada arquivo salvo |

## Antes de abrir um pull request

```bash
npx tsc --noEmit
npx eslint app lib
npm test
```

Os dois primeiros não devem mostrar nada, e o `npm test` deve terminar com todos os testes passando.

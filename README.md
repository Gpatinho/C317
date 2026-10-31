# Observatório do Turismo de Santa Rita do Sapucaí (OT-SRS)

Plataforma web que organiza e publica os dados do turismo de Santa Rita do Sapucaí (MG):
indicadores de visitantes, hospedagem, leitos, empresas e empregos, relatórios em PDF,
eventos e o inventário turístico da cidade.

Projeto da disciplina **C317 – Tópicos Especiais I (Inatel)**, Prof. Daniel Mosca, a partir da
proposta do edital **HEIComp 2026.2** para a SMCELT (Secretaria Municipal de Cultura, Esporte,
Lazer e Turismo).

## O que o sistema faz

| Lado | Telas |
|---|---|
| **Público** | Home, dashboard de indicadores (filtros por período e setor) com busca de lugares, página de cada lugar (horários, melhor época, Instagram), relatórios para download, página do Cadastur e da FNRH Digital, área do estabelecimento para enviar os dados do mês |
| **Painel administrativo** (`/admin`, com login) | Visão geral, lançar valores mensais, publicar relatórios, análise dos envios, estabelecimentos, eventos, inventário turístico, usuários, minha conta (troca de senha) |
| **Estabelecimentos** | Hotéis e pousadas enviam os próprios dados com um código de acesso; a SMCELT aprova antes de publicar |

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Front-end | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Back-end | Node.js 22, Express 5, Zod 4, JWT, bcrypt, Multer |
| Banco de dados | MySQL 8 com Prisma 7 |
| Ambiente | Docker (banco), GitHub Codespaces |

## Estrutura do repositório

```
C317/
├── backend/             # API REST (Express + Prisma)      → backend/README.md
├── front/               # site e painel (Next.js)          → front/README.md
├── docs/
│   ├── mockups/         # protótipos do Figma, por tela
│   ├── banco-de-dados.md   # diagrama e descrição das tabelas
│   ├── guia-api-front.md   # rotas usadas por cada tela, com exemplos
│   ├── deploy.md           # como publicar (Docker, variáveis, migrations, PDFs)
│   └── roteiro-de-testes.md # passo a passo para testar tudo pelas telas
├── docker-compose.yml   # MySQL, API e site com Docker (o projeto inteiro com um comando)
└── .gitattributes       # mantém os scripts .sh com final de linha Unix
```

## Jeito mais rápido: tudo no Docker (um comando)

Para rodar o sistema inteiro sem instalar Node nem MySQL, por exemplo para testar ou apresentar.
Só precisa do **Git** e do **Docker Desktop** aberto. Na raiz do projeto:

```bash
docker compose --profile completo up -d --build
```

Isso sobe o **MySQL**, a **API** (com as migrations e os dados de exemplo) e o **site**. A primeira
vez demora alguns minutos; depois é rápido. Confira com `docker compose --profile completo ps`
(os três "healthy" ou "running") e abra **http://localhost:3000**. Os logins estão na tabela
"Acessar", mais abaixo.

| Para | Comando (na raiz) |
|---|---|
| Ligar tudo | `docker compose --profile completo up -d --build` |
| Desligar (os dados ficam guardados) | `docker compose --profile completo down` |
| Apagar os dados e começar do zero | `docker compose --profile completo down -v` e ligar de novo |
| Ver os logs da API | `docker compose --profile completo logs api` |

> Se der erro de porta ocupada (3000, 3333 ou 3306), feche o `npm run dev` ou o MySQL que já está
> rodando no seu computador e ligue de novo.

## Como rodar para desenvolver (primeira vez)

Para editar o código, cada parte roda fora do Docker e atualiza sozinha ao salvar um arquivo.

**Pré-requisitos:** Git, Node.js 22 LTS e **Docker Desktop** aberto (ou um MySQL 8 instalado com
usuário `root` e senha `root`).

### 1. Banco de dados

```bash
docker compose up -d      # liga o MySQL (usuário root, senha root, banco observatorio)
docker compose ps         # espere aparecer "healthy"
```

> Se der erro de porta 3306 ocupada, já existe outro MySQL rodando na sua máquina. Desligue-o ou
> use o seu MySQL em vez do Docker (com usuário e senha `root`, ou ajuste o `backend/.env`).

### 2. Back-end (terminal 1)

```bash
cd backend
cp .env.example .env          # no PowerShell: Copy-Item .env.example .env
npm install
npx prisma migrate deploy     # cria as tabelas
npx prisma generate           # gera o Prisma Client
npx prisma db seed            # admin + dados FICTÍCIOS de exemplo
npm run dev                   # API em http://localhost:3333/api
```

### 3. Front-end (terminal 2)

```bash
cd front
cp .env.example .env.local    # no PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev                   # site em http://localhost:3000
```

### 4. Acessar

| O quê | Onde |
|---|---|
| Site público | http://localhost:3000 |
| Painel administrativo | http://localhost:3000/login, com `admin@observatorio.local` / `admin123` |
| Usuário EDITOR (sem permissão de excluir) | `editor@observatorio.local` / `editor123` |
| API (teste rápido) | http://localhost:3333/api/health → `{"status":"online"}` |
| Códigos de teste da coleta | `CENT-2026` (hotel) e `SERR-2026` (pousada) |

Todos os dados do seed são **fictícios**, apenas para desenvolvimento e demonstração.
Para testar o sistema inteiro pelas telas com esses dados, siga o `docs/roteiro-de-testes.md`.

### Mexendo só no front: API e banco no Docker

Quem só vai editar o site pode pular o passo 2 e ligar o MySQL e a API em containers:

```bash
docker compose up -d --build api   # MySQL + API (migrations e seed automáticos)
```

A API fica em http://localhost:3333/api; o front continua com `npm run dev` (passo 3). O passo a
passo para publicar o sistema está em `docs/deploy.md`.

## Dia a dia

| Para | Comando |
|---|---|
| Ligar tudo | `docker compose up -d` na raiz, `npm run dev` em `backend` e em `front` |
| Desligar | Ctrl+C nos terminais e `docker compose down` na raiz |
| Apagar os dados e começar do zero | `docker compose down -v`, depois `migrate deploy` e `db seed` de novo |
| Depois de um `git pull` com migration nova | `npx prisma migrate deploy` e `npx prisma generate` em `backend` |

## Como contribuir

1. Atualize a `main` (`git checkout main` e `git pull`) e crie uma branch: `feature/<nome-curto>`.
2. Antes de enviar, rode `npx tsc --noEmit` (e `npx eslint app lib` no front).
3. Faça o push e abra um **pull request**; outra pessoa da equipe revisa antes do merge.

## Equipe

| Integrante | Papel |
|---|---|
| Clara de Lima Azevedo | Líder, back-end e banco de dados |
| Donatto Pieve Costa Campo | Back-end |
| Kauã Victor Garcia Siécola | Back-end e integração |
| Guilherme Felipe Ribeiro | Front-end |
| Maria Eduarda de Oliveira Alves | Front-end |

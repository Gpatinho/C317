# Guia da API para as telas que faltam

Para cada tela pendente: as rotas que ela usa, o que mandar e o que volta. A lista completa de
rotas está em `backend/README.md`; exemplos prontos para testar estão em `backend/requests.http`.

**Regras gerais**

- Base: `NEXT_PUBLIC_API_URL` (local: `http://localhost:3333/api`).
- 🔒 = precisa do header `Authorization: Bearer <token>` (o `request()` de `front/lib/api.ts` já põe).
  👑 = só `ADMIN`; um `EDITOR` recebe `403`.
- Mês sempre no formato `"2026-09"`; datas de evento em `"2026-07-12"`.
- Erro sempre volta como `{ "erro": "mensagem" }`. Erro de validação traz também
  `"detalhes": [{ "campo": "valor", "mensagem": "..." }]`, bom para mostrar embaixo de cada campo.
- `401` no painel = sessão expirada → chamar `sessaoExpirou()`.

Os exemplos usam os dados do seed (`npx prisma db seed`).

---

## 1. Formulário público de coleta — `/coleta` (Guilherme)

Página **sem login**. O hotel digita o código de acesso e envia o valor do mês.

### Entrar com o código

`POST /api/coleta/acesso`

```json
{ "codigo": "CENT-2026" }
```

Resposta `200`:

```json
{
  "estabelecimento": { "id": 1, "nome": "Hotel Exemplo Centro (fictício)", "categoria": "Hotel" },
  "indicadores": [
    { "id": 3, "nome": "Taxa de ocupação", "unidade": "%", "descricao": "Ocupação média da rede hoteleira" },
    { "id": 4, "nome": "Leitos disponíveis", "unidade": "leitos", "descricao": "Total de leitos ofertados" }
  ],
  "envios": [
    { "id": 5, "valor": 72, "periodo": "2026-09", "status": "PENDENTE", "motivoRejeicao": null,
      "enviadoEm": "2026-10-29T15:01:17.831Z", "indicador": { "nome": "Taxa de ocupação", "unidade": "%" } }
  ]
}
```

- `indicadores` = o que esse estabelecimento pode enviar (monta o select).
- `envios` = os 20 últimos, para mostrar o histórico com o status (e o motivo, se rejeitado).
- Código errado → `401 { "erro": "Código de acesso inválido." }`.
- O código pode ser digitado com ou sem traço e em minúsculas (`cent2026` funciona).
- Guarde o código só na memória da página (estado do React), nunca em `localStorage`.

### Enviar o valor do mês

`POST /api/coleta/envios`

```json
{ "codigo": "CENT-2026", "indicadorId": 3, "valor": 75, "periodo": "2026-10", "observacao": "opcional" }
```

Resposta `201`: o envio criado, com `"status": "PENDENTE"`. Erros que a tela precisa tratar:

| Status | Mensagem |
|---|---|
| `400` | "Não é possível enviar dados de um mês que ainda não começou." |
| `400` | "Este indicador não está aberto para envio pelos estabelecimentos." |
| `409` | "Já existe um envio deste mês aguardando análise da SMCELT." |
| `409` | "Já existe um valor publicado para este mês. Fale com a SMCELT para corrigir." |
| `429` | Muitas tentativas erradas em 15 minutos |

---

## 2. Análise dos envios — `/admin/envios` (Guilherme)

O link "Ver envios" do painel já aponta para cá.

### Listar 🔒

`GET /api/submissoes?status=PENDENTE` (filtros opcionais: `status`, `estabelecimentoId`)

```json
[
  {
    "id": 5, "valor": 72, "periodo": "2026-09", "observacao": "Feriado prolongado aumentou a procura.",
    "status": "PENDENTE", "motivoRejeicao": null, "enviadoEm": "2026-10-29T15:01:17.831Z",
    "analisadoEm": null,
    "estabelecimento": { "id": 1, "nome": "Hotel Exemplo Centro (fictício)", "categoria": "Hotel" },
    "indicador": { "id": 3, "nome": "Taxa de ocupação", "unidade": "%" },
    "analisadoPor": null
  }
]
```

Para abas com contadores (Pendentes / Aprovados / Rejeitados): `GET /api/submissoes/contagem` 🔒 →
`{ "PENDENTE": 2, "APROVADA": 1, "REJEITADA": 1 }`.

### Aprovar 🔒

`POST /api/submissoes/:id/aprovar` (sem corpo) → `200` com o envio `APROVADA`. O valor passa a
aparecer no dashboard. `409` se já existir valor publicado daquele estabelecimento no mês.

### Rejeitar 🔒

`POST /api/submissoes/:id/rejeitar`

```json
{ "motivo": "Taxa de ocupação acima de 100%. Confira e envie de novo." }
```

Motivo com menos de 3 caracteres → `400` com `detalhes`. Só envios `PENDENTE` podem ser aprovados ou rejeitados.

---

## 3. Estabelecimentos — `/admin/estabelecimentos` (Guilherme)

| Ação | Rota | Corpo |
|---|---|---|
| Listar | `GET /api/estabelecimentos` | – |
| Criar 🔒 | `POST /api/estabelecimentos` | `{ "nome", "categoria", "endereco"?, "regiao"? }` |
| Editar 🔒 | `PUT /api/estabelecimentos/:id` | os campos que mudaram |
| Excluir 🔒👑 | `DELETE /api/estabelecimentos/:id` | – (`204`; `409` se tiver valores publicados) |
| Gerar código 🔒👑 | `POST /api/estabelecimentos/:id/codigo` | – |

Cada item da lista traz `"temCodigo": true/false`: use para mostrar "Gerar código" ou "Gerar novo código".

Resposta de gerar código:

```json
{ "estabelecimento": { "id": 1, "nome": "Hotel Exemplo Centro (fictício)" }, "codigo": "MWWC-C7G5" }
```

O código **só aparece nessa resposta**: mostre num modal com botão de copiar e o aviso
"anote e repasse ao estabelecimento". Gerar outro invalida o anterior.

---

## 4. Eventos — `/admin/eventos` (Donatto)

| Ação | Rota | Corpo |
|---|---|---|
| Listar | `GET /api/eventos` (todos) ou `?futuros=true&limite=4` | – |
| Criar 🔒 | `POST /api/eventos` | ver abaixo |
| Editar 🔒 | `PUT /api/eventos/:id` | os campos que mudaram |
| Excluir 🔒👑 | `DELETE /api/eventos/:id` | – (`204`) |

```json
{ "nome": "Festival de Inverno", "dataInicio": "2027-07-12", "dataFim": "2027-07-14",
  "local": "Praça Central", "contato": "@festival", "gratuito": true, "icone": "🎵", "descricao": "opcional" }
```

As datas voltam como `"2027-07-12T00:00:00.000Z"`: use `data.slice(0, 10)` para mostrar, sem
`new Date()` (que pode mostrar o dia anterior no fuso do Brasil). `dataFim` nulo = evento de um dia.
Data final antes da inicial → `400`.

---

## 5. Inventário turístico — `/admin/inventario` e `/inventario` (Donatto e Maria Eduarda)

| Ação | Rota | Corpo |
|---|---|---|
| Listar (público) | `GET /api/atrativos?tipo=ATRATIVO&categoria=Igreja` (filtros opcionais) | – |
| Categorias de um tipo | `GET /api/atrativos/categorias?tipo=ATRATIVO` | – |
| Atrasados 🔒 | `GET /api/atrativos/revisao-pendente` | – |
| Buscar pelo nome (público) | `GET /api/atrativos?busca=cruzeiro` (mínimo 2 letras; também procura na categoria e no endereço) | – |
| Um lugar (público) | `GET /api/atrativos/:id` | – |
| Criar 🔒 | `POST /api/atrativos` | `{ "nome", "tipo", "categoria", "descricao"?, "endereco"?, "contato"?, "horarioFuncionamento"?, "melhorHorario"?, "periodoMovimentado"?, "instagram"? }` |
| Editar 🔒 | `PUT /api/atrativos/:id` | os campos que mudaram (conta como revisão) |
| Marcar como revisado 🔒 | `POST /api/atrativos/:id/revisar` | – |
| Excluir 🔒👑 | `DELETE /api/atrativos/:id` | – (`204`) |

`tipo`: `ATRATIVO` (o que motiva a visita), `EQUIPAMENTO` (hotel, restaurante…) ou `SERVICO`
(guia, agência…). Item da lista:

```json
{ "id": 8, "nome": "Guia de Turismo Exemplo (fictício)", "tipo": "SERVICO", "categoria": "Guia de turismo",
  "descricao": null, "endereco": null, "contato": "(35) 0000-0000", "revisadoEm": "2024-11-20T00:00:00.000Z" }
```

**Informações para o visitante** (todas opcionais, texto livre de até 255 caracteres): `horarioFuncionamento`,
`melhorHorario` (melhor horário para visitar) e `periodoMovimentado` (época do ano mais frequentada).
`instagram` aceita `@perfil`, `perfil` ou o link do perfil e a API guarda só o nome (`"inatel"`); string vazia apaga.
O formulário do painel deve ter um campo para cada um. A página pública `/lugares/[id]` (já pronta) mostra esses dados,
e a barra de busca do dashboard usa `?busca=`.

`revisao-pendente` responde `{ "meses": 12, "total": 3, "atrativos": [ ... ] }`, mais atrasados primeiro.

---

## 6. Usuários — `/admin/usuarios` (Maria Eduarda) 🔒👑

Todas as rotas são só para `ADMIN`; esconda o item do menu para `EDITOR`.

| Ação | Rota | Corpo |
|---|---|---|
| Listar | `GET /api/usuarios` | – |
| Criar | `POST /api/usuarios` | `{ "nome", "email", "senha", "papel"? }` (papel padrão `EDITOR`) |
| Editar / redefinir senha | `PUT /api/usuarios/:id` | os campos que mudaram, ex.: `{ "senha": "nova1234" }` |
| Excluir | `DELETE /api/usuarios/:id` | – (`204`) |

Item da lista (a senha nunca volta): `{ "id": 3, "nome": "Editor", "email": "editor@x.com", "papel": "EDITOR", "criadoEm": "..." }`.
A API não deixa o admin excluir a si mesmo nem mudar o próprio papel (`400`).

**Trocar a própria senha** (qualquer usuário logado) 🔒: `PUT /api/auth/senha` com
`{ "senhaAtual", "novaSenha" }` → `204`. Senha atual errada → `400 "A senha atual está incorreta."`.
O link "Esqueceu sua senha?" do login pode virar "Esqueceu a senha? Fale com o administrador".

---

## 7. Dashboard: filtro por setor e eventos (Kauã)

- **Setores reais:** `GET /api/indicadores/categorias` → `["Empregos", "Empresas", "Hospedagem", "Leitos", "Visitantes"]`.
  Passe o escolhido em `GET /api/dashboard/resumo?inicio=2026-01&fim=2026-10&categoria=Hospedagem`
  (sem `categoria` = visão geral). Em `lib/api.ts` a função `api.resumo({ inicio, fim, categoria })` já aceita.
- **Eventos:** `GET /api/eventos?futuros=true&limite=4` no lugar da lista fixa `eventosFuturos`.
  `gratuito: true/false` vira "Gratuito"/"Pago".

## 8. Cadastur e FNRH Digital — `/cadastur` (Maria Eduarda)

Página só de conteúdo: não usa a API.

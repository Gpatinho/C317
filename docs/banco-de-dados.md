# Banco de dados — Observatório do Turismo

Banco **MySQL 8**, acessado pela API com o **Prisma 7**. A estrutura completa fica em
`backend/prisma/schema.prisma` e cada mudança tem uma migration em `backend/prisma/migrations/`.

O modelo do Milestone III tinha 4 tabelas (`usuario`, `indicador`, `registro_indicador` e
`relatorio`). Na implementação, `estabelecimento` entrou já na primeira migration, e depois vieram
`evento`, `atrativo` (inventário turístico) e `submissao` (coleta pelos hotéis): 8 tabelas no total.

## Diagrama

O GitHub desenha o diagrama abaixo automaticamente.

```mermaid
erDiagram
    usuario ||--o{ registro_indicador : "lança"
    usuario ||--o{ relatorio : "publica"
    usuario |o--o{ submissao : "analisa"
    indicador ||--o{ registro_indicador : "tem valores"
    indicador ||--o{ submissao : "recebe envios"
    estabelecimento |o--o{ registro_indicador : "valor do estabelecimento"
    estabelecimento ||--o{ submissao : "envia"
    registro_indicador |o--o| submissao : "criado na aprovação"

    usuario {
        int id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        enum papel "ADMIN ou EDITOR"
        datetime criado_em
    }
    indicador {
        int id PK
        varchar nome
        varchar categoria "setor"
        varchar unidade
        varchar descricao
        enum agregacao "SOMA, ULTIMO ou MEDIA"
        boolean ativo
        boolean coleta_estabelecimento
    }
    registro_indicador {
        int id PK
        int indicador_id FK
        int estabelecimento_id FK "NULL = valor do município"
        int usuario_id FK
        decimal valor
        date periodo "1º dia do mês"
        datetime criado_em
        datetime atualizado_em
    }
    relatorio {
        int id PK
        varchar titulo
        text descricao
        int ano
        varchar arquivo_nome
        varchar arquivo_path "arquivo em uploads/"
        int tamanho_bytes
        datetime publicado_em
        int usuario_id FK
    }
    estabelecimento {
        int id PK
        varchar nome
        varchar categoria
        varchar endereco
        varchar regiao
        char codigo_acesso_hash UK "SHA-256 do código"
    }
    submissao {
        int id PK
        int estabelecimento_id FK
        int indicador_id FK
        decimal valor
        date periodo
        text observacao
        enum status "PENDENTE, APROVADA ou REJEITADA"
        varchar motivo_rejeicao
        datetime enviado_em
        datetime analisado_em
        int analisado_por_id FK
        int registro_id FK, UK
    }
    evento {
        int id PK
        varchar nome
        date data_inicio
        date data_fim "NULL = um dia só"
        varchar local
        varchar contato
        boolean gratuito
        varchar icone
        text descricao
    }
    atrativo {
        int id PK
        varchar nome
        enum tipo "ATRATIVO, EQUIPAMENTO ou SERVICO"
        varchar categoria
        text descricao
        varchar endereco
        varchar contato
        datetime revisado_em
    }
```

## Tabelas

| Tabela | Guarda | Observações |
|---|---|---|
| `usuario` | Equipe da SMCELT com acesso ao painel | Senha guardada com bcrypt. Papel `ADMIN` pode excluir e gerenciar usuários; `EDITOR` não |
| `indicador` | O que é medido (Visitantes, Taxa de ocupação, Leitos…) | `categoria` é o setor usado nos filtros. `agregacao` diz como somar vários meses: SOMA (visitantes), MEDIA (taxas) ou ULTIMO (estoques, como nº de leitos). `coleta_estabelecimento` libera o indicador para os hotéis enviarem |
| `registro_indicador` | O valor oficial de um indicador em um mês | Sem `estabelecimento_id` = valor do município, que tem prioridade no dashboard. Não pode haver dois valores para o mesmo indicador, mês e estabelecimento |
| `relatorio` | Relatórios publicados | O PDF fica na pasta `backend/uploads/`; o banco guarda o nome e o tamanho |
| `estabelecimento` | Hotéis, pousadas e outros negócios | Guarda só o **hash** do código de acesso da coleta, nunca o código. Não pode ser apagado se tiver valores publicados |
| `submissao` | Envios feitos pelos estabelecimentos | Entra como `PENDENTE`. Ao ser aprovado, cria o `registro_indicador` (na mesma transação) e guarda o `registro_id`. Rejeitado guarda o motivo |
| `evento` | Eventos turísticos da cidade | Exibidos na Home e no dashboard |
| `atrativo` | Inventário turístico (atrativos, equipamentos, serviços) | `revisado_em` muda a cada edição ou revisão; itens com mais de 12 meses aparecem no lembrete do painel |

## Migrations

| Migration | O que fez |
|---|---|
| `20261002203838_init` | Tabelas do Milestone III: usuario, indicador, estabelecimento, registro_indicador, relatorio |
| `20261006210537_eventos` | Tabela evento |
| `20261007013423_inventario` | Tabela atrativo |
| `20261014130023_coleta_estabelecimentos` | Tabela submissao, código de acesso dos estabelecimentos e `coleta_estabelecimento` nos indicadores |

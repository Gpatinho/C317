# Roteiro de testes de ponta a ponta

Passo a passo para testar o sistema inteiro pelas telas, como um usuário faria.
Cada passo diz **o que fazer** e **o que deve aparecer**. Os números esperados batem com os dados de demonstração do seed (`backend/prisma/seed.ts`).

Se algo não bater, anote o código do passo (ex.: `D3`) e o que apareceu.

---

## 0. Preparação

Comece sempre de um banco limpo, para os números baterem:

```bash
cd backend
npx prisma migrate reset --force   # APAGA todos os dados do banco de desenvolvimento
npm run db:seed                    # dados de demonstração
npm run dev                        # API em http://localhost:3333/api

# em outro terminal
cd front
npm run dev                        # site em http://localhost:3000
```

### Dados de demonstração (todos fictícios)

| O quê | Dados |
|---|---|
| Usuário ADMIN | `admin@observatorio.local` / `admin123` |
| Usuário EDITOR | `editor@observatorio.local` / `editor123` (Ana Editora) |
| Indicadores | 7 em 5 setores. Valores do município de jan/2025 a **set/2026** |
| Hóspedes | Indicador que vem **só dos estabelecimentos** (hotel + pousada), de jan/2025 a **ago/2026** |
| Estabelecimentos | Hotel Exemplo Centro (código `CENT-2026`) e Pousada Exemplo da Serra (código `SERR-2026`) |
| Envios da coleta | 2 pendentes (hóspedes de set/2026), 1 aprovado, 1 rejeitado (ocupação de 108%) |
| Relatórios | 3 PDFs: 1 de 2026 e 2 de 2025 |
| Eventos | 7, sendo 1 que já terminou (Semana do Turismo, set/2026) |
| Inventário | 9 itens (4 lugares com informações de visita de exemplo: Santo Cruzeiro, Inatel, Campão de Eventos e Bloco do Urso), 1 sem revisão há mais de 12 meses |

> Os passos assumem que você está testando em **outubro/2026 ou depois**. Outubro/2026 ainda não tem dados lançados.

---

## 1. Home (`/`)

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| H1 | Abrir `http://localhost:3000` | Título "Observatório de Turismo SRS", carrossel com 4 fotos, logos institucionais e rodapé | ☐ |
| H2 | Olhar os contadores do card "O Vale da Eletrônica" | **7** Indicadores · **3** Relatórios · **5** Setores | ☐ |
| H3 | Desligar a API (Ctrl+C no terminal do backend) e recarregar | Os contadores mostram "—" e a página não quebra. Ligue a API de novo | ☐ |
| H4 | Clicar em "Ver dashboard", "Ver relatórios" e "Login ADM" | Abrem `/dashboard`, `/relatorios` e `/login` | ☐ |

## 2. Dashboard público (`/dashboard`)

Ao abrir, o período vem de 01/01 do ano atual até hoje.

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| D1 | Abrir `/dashboard` | Aparece "Atualizado em …" com a data em que o seed rodou, e 7 cards (tabela abaixo) | ☐ |
| D2 | Conferir os cards | Valores da tabela abaixo | ☐ |
| D3 | Olhar o gráfico "Evolução mensal de visitantes" | Linha de Jan a Out. **Out sem ponto** (sem dado). Abaixo: "167.100 visitantes no período, com pico em Set/2026 (29.600)." | ☐ |
| D4 | Passar o mouse sobre o selo de variação de um card | Mostra "Comparado a …" (ex.: "Comparado a Jan–Set/2025") | ☐ |
| D5 | Mudar o período para **01/07/2026 até 30/09/2026** | Visitantes: **76.600**, ↗ +10,7%, "total de Jul–Set/2026". Taxa de ocupação: **77%**, ↗ +5,5% | ☐ |
| D6 | Mudar o período para **01/01/2025 até 31/12/2025** | Visitantes: **209.100**, com o selo "**sem comparação**" (não há dados de 2024) | ☐ |
| D7 | Mudar o período para **01/01/2024 até 31/12/2024** | Cards com "—" e "sem dados no período selecionado". Gráfico: "Sem dados de visitantes para o período selecionado." | ☐ |
| D8 | Desligar a API e mudar o período | Aparece uma mensagem de erro em vermelho. Ligue a API de novo | ☐ |

**Cards esperados (período padrão, jan–out/2026):**

| Card | Valor | Legenda | Variação |
|---|---|---|---|
| Visitantes | 167.100 | pessoas · total de Jan–Set/2026 | ↗ +10,2% vs Jan–Set/2025 |
| Hóspedes | 17.980 | hóspedes · total de **Jan–Ago**/2026 | ↗ +7,3% vs Jan–Ago/2025 |
| Meios de hospedagem | 44 | estabelecimentos · valor de Set/2026 | ↗ +10% vs Set/2025 |
| Taxa de ocupação | 66,9% | média de Jan–Set/2026 | ↗ +5,6% vs Jan–Set/2025 |
| Leitos disponíveis | 1.120 | leitos · valor de Set/2026 | ↗ +7,7% vs Set/2025 |
| Empresas do setor | 286 | empresas · valor de Set/2026 | ↗ +4,8% vs Set/2025 |
| Empregos no turismo | 2.230 | postos · valor de Set/2026 | ↗ +8,8% vs Set/2025 |

> Hóspedes vai só até agosto porque setembro ainda está **pendente de análise** (seção 8). Mesmo com o período indo até outubro, o card considera só os meses com dado. Isso é proposital: mês sem dado não conta como zero.

## 3. Relatórios públicos (`/relatorios`)

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| R1 | Abrir `/relatorios` | "3 relatórios publicados". Filtros de ano: **Todos, 2026, 2025** | ☐ |
| R2 | Conferir a ordem dos cards | 1º "Boletim do Turismo – 1º semestre de 2026" (publicado em 20 jul. 2026), 2º "Anuário do Turismo 2025", 3º "Perfil do visitante – Festival de Inverno 2025" | ☐ |
| R3 | Clicar em **2025** | Só os 2 relatórios de 2025. "Exibindo 2 de 2 relatórios" | ☐ |
| R4 | Clicar em Todos e buscar `festival` | Só "Perfil do visitante – Festival de Inverno 2025" | ☐ |
| R5 | Buscar `PERFIL` (maiúsculas) e depois `anuario` (sem acento) | Encontra os relatórios do mesmo jeito: a busca ignora maiúsculas e acentos | ☐ |
| R6 | Buscar `xyz` | "Nenhum relatório encontrado" e o botão "Limpar filtros", que volta a mostrar os 3 | ☐ |
| R7 | Clicar em **Baixar PDF** no Boletim | Baixa `boletim-1-semestre-2026.pdf` | ☐ |
| R8 | Clicar em **Visualizar** | Abre o PDF numa nova aba, com o título e o aviso "DOCUMENTO DE EXEMPLO" | ☐ |
| R9 | Desligar a API e recarregar | "Não foi possível carregar os relatórios…" e o botão "Tentar de novo". Ligue a API e clique nele: a lista volta | ☐ |

## 4. Login (`/login`)

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| L1 | Abrir `/admin` sem estar logado | Vai para `/login` | ☐ |
| L2 | Entrar com `admin@observatorio.local` e senha `errada` | "E-mail ou senha incorretos." | ☐ |
| L3 | Entrar com um e-mail que não existe | A **mesma** mensagem do L2 (não revela se o e-mail existe) | ☐ |
| L4 | Clicar no olho do campo senha | A senha aparece e some | ☐ |
| L5 | Entrar com `ADMIN@observatorio.local` / `admin123` | Entra (o e-mail não diferencia maiúsculas) e abre `/admin` | ☐ |
| L6 | Sair, entrar **desmarcando** "Lembrar de mim", fechar a aba e abrir `/admin` numa aba nova | Pede login de novo | ☐ |
| L7 | Logado, abrir as Ferramentas do desenvolvedor (F12) → Application → Local Storage (ou Session Storage, se entrou sem "Lembrar de mim"), trocar o valor de `token` por `abc` e recarregar | Vai para o login com "Sua sessão expirou. Entre novamente para continuar." | ☐ |
| L8 | **Faça este por último:** errar a senha várias vezes seguidas e depois tentar com a senha certa | Depois de 10 erros em 15 minutos (os do L2 e L3 contam), aparece "Muitas tentativas de login. Aguarde 15 minutos e tente de novo.", **mesmo com a senha certa**. Para liberar antes, reinicie a API | ☐ |

## 5. Painel administrativo (`/admin`), logado como ADMIN

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| A1 | Entrar como ADMIN | "Olá, Equipe" e "Dados atualizados em …". No menu: Equipe SMCELT, com o selo **Administrador** | ☐ |
| A2 | Conferir os 4 números | **2** envios de hotéis aguardando análise (card destacado em amarelo) · **3** relatórios publicados · **7** indicadores ativos · **1** item do inventário sem revisão há mais de 12 meses | ☐ |
| A3 | Olhar "Últimos lançamentos" | Tabela com 5 linhas (indicador, mês, valor, lançado por, atualizado em) | ☐ |
| A4 | Clicar em "Ver no dashboard →" | Abre `/dashboard` | ☐ |
| A5 | Clicar em "Ver site público ↗" no menu | Abre a home numa nova aba | ☐ |
| A6 | Reduzir a janela para largura de celular | Aparece a barra superior com o botão ☰. Ele abre o menu em gaveta, que fecha no X ou clicando fora | ☐ |
| A7 | Clicar em **Sair** | Volta para `/login`. Abrir `/admin` de novo pede login | ☐ |

## 6. Lançar valores (`/admin/lancar`)

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| V1 | Abrir a tela | Formulário "Novo lançamento" e a lista "Lançamentos": "Exibindo 8 de **166**" e o botão "Carregar mais" | ☐ |
| V2 | Clicar em "Salvar lançamento" sem preencher nada | "Escolha um indicador." e "Digite o valor." | ☐ |
| V3 | Digitar `abc` no valor | "Digite um número válido (ex.: 29.600 ou 83,5)." | ☐ |
| V4 | Digitar `-5` | "O valor não pode ser negativo." | ☐ |
| V5 | Indicador **Visitantes**, mês **Setembro/2026**, valor `30.000` | Erro de valor duplicado: "Já existe um valor para este indicador neste mês…" e o link "Editar o valor existente →", que abre o lançamento de 29.600 | ☐ |
| V6 | Abrir o select de mês | O mês mais recente é o atual. Não há meses futuros | ☐ |
| V7 | Indicador **Visitantes**, mês **Outubro/2026**, município, valor `21.000` | "Valor lançado! Ele já aparece no dashboard público." A linha nova aparece destacada no topo da lista | ☐ |
| V8 | Abrir `/dashboard` | Visitantes: **188.100**, "total de Jan–Out/2026", ↗ +10,3%. O gráfico ganha o ponto de Out | ☐ |
| V9 | Em `/admin`, olhar "Últimos lançamentos" | Visitantes · Out/2026 · 21.000 · Equipe SMCELT na primeira linha | ☐ |
| V10 | Na lista, clicar em **Editar** no lançamento de Out/2026, mudar para `22.500` e salvar | "Lançamento atualizado! O dashboard já mostra o novo valor." No dashboard, Visitantes passa a **189.600** | ☐ |
| V11 | Editar o mesmo lançamento e trocar o mês para **Setembro/2026** | "Já existe outro valor para este indicador neste mês." | ☐ |
| V12 | Filtrar por indicador **Hóspedes** | "Exibindo 8 de 40". As linhas mostram o nome do estabelecimento embaixo do indicador | ☐ |
| V13 | Limpar o filtro e buscar `pousada` | Só lançamentos da Pousada Exemplo da Serra (20) | ☐ |
| V14 | Limpar a busca e escolher mês inicial **Jan/2026** e final **Mar/2026** | Só lançamentos de jan a mar/2026 | ☐ |
| V15 | Buscar `xyz` | "Nenhum lançamento encontrado" e o botão "Limpar filtros" | ☐ |
| V16 | Clicar em **Excluir** no lançamento de Out/2026 e confirmar | "Lançamento excluído." No dashboard, Visitantes volta para **167.100** | ☐ |

## 7. Publicar relatório (`/admin/publicar`)

Para os testes de erro, tenha à mão um `.docx` qualquer e um arquivo de texto renomeado para `falso.pdf`.

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| P1 | Abrir a tela | Formulário "Novo relatório" (ano já preenchido com o ano atual) e a lista com os 3 relatórios | ☐ |
| P2 | Escolher o `.docx` | "Apenas arquivos PDF são aceitos." | ☐ |
| P3 | Escolher o `falso.pdf` | "O arquivo enviado não é um PDF válido." | ☐ |
| P4 | Escolher um PDF de verdade e digitar o título `ab` | "O título precisa ter pelo menos 3 caracteres." | ☐ |
| P5 | Ano `1999` | "Use um ano entre 2000 e 2100." | ☐ |
| P6 | Título `Boletim do Turismo – 3º trimestre 2026`, ano 2026, PDF válido, clicar em "Publicar relatório" | Barra "Enviando… %" e depois "Relatório publicado!" com os botões "Ver na página pública ↗" e "Publicar outro" | ☐ |
| P7 | Abrir `/relatorios` | "4 relatórios publicados", e o novo é o primeiro | ☐ |
| P8 | Na lista do painel, **editar** o relatório novo (trocar o título) | O título muda no painel e em `/relatorios` | ☐ |
| P9 | **Excluir** o relatório novo e confirmar | Some do painel e de `/relatorios` (volta a "3 relatórios publicados") | ☐ |
| P10 | Arrastar um PDF de mais de 20 MB | "O arquivo passa de 20 MB. Diminua o tamanho e tente de novo." | ☐ |

## 8. Coleta e análise de envios (ainda sem tela: pelo `requests.http`)

As telas de coleta (para os hotéis) e de análise dos envios (`/admin/envios`) ainda não existem no front, mas a API está pronta. Teste pelo arquivo `backend/requests.http`, com a extensão **REST Client** do VS Code: clique em "Send Request" acima de cada bloco. Rode o "Login" primeiro, para preencher o token.

| # | Requisição | Resultado esperado | OK |
|---|---|---|---|
| C1 | "Estabelecimento entra com o código de teste" (`CENT-2026`) | Hotel Exemplo Centro. Indicadores liberados: Hóspedes, Leitos disponíveis, Taxa de ocupação. Envios: hóspedes de set/2026 **PENDENTE** e ocupação de set/2026 **REJEITADA**, com o motivo "A taxa de ocupação não pode passar de 100%…" | ☐ |
| C2 | Trocar o código para `cent 2026` e enviar de novo | Funciona igual (ignora maiúsculas, espaço e traço) | ☐ |
| C3 | Trocar o código para `XXXX-0000` | 401 "Código de acesso inválido." | ☐ |
| C4 | "Estabelecimento reenvia a taxa de ocupação" (valor 86) | 201, status PENDENTE | ☐ |
| C5 | Enviar a mesma requisição de novo | 409 "Já existe um envio deste mês aguardando análise da SMCELT." | ☐ |
| C6 | "Quantos envios em cada status" | `PENDENTE: 3, APROVADA: 1, REJEITADA: 1`. Em `/admin`, o card mostra **3** | ☐ |
| C7 | "Fila de envios pendentes" | 3 envios, do mais antigo para o mais novo: hotel (hóspedes), pousada (hóspedes), hotel (ocupação) | ☐ |
| C8 | "Aprovar o primeiro envio pendente" **duas vezes** (rode a fila de novo entre uma e outra) | As duas aprovações dão status APROVADA. No dashboard, Hóspedes passa a **21.570**, "total de **Jan–Set**/2026", ↗ +7,8% | ☐ |
| C9 | Rodar a fila de novo e aprovar o envio que sobrou (ocupação de 86% do hotel) | APROVADA, mas a Taxa de ocupação do dashboard **continua 66,9%**: quando existe valor do município no mês, ele tem prioridade sobre o dos estabelecimentos. É o comportamento esperado | ☐ |
| C10 | Sem rodar a fila antes, enviar de novo a requisição de aprovar (ela usa o mesmo id) | 409 "Este envio já foi analisado." | ☐ |
| C11 | Abrir `/admin` | Envios aguardando análise: **0** (card sem destaque) | ☐ |
| C12 | "Próximos eventos" | 4 eventos: Natal Iluminado, Carnaval de Santa Rita, Festival de Inverno, Feira de Eletrônica e Inovação. A Semana do Turismo (já terminou) **não** aparece | ☐ |

## 9. Usuário EDITOR

| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| E1 | Sair e entrar com `editor@observatorio.local` / `editor123` | "Olá, Ana". No menu: Ana Editora, com o selo **Editor** | ☐ |
| E2 | Abrir "Lançar valores" | Pode lançar e **editar**, mas **não aparece** o botão Excluir | ☐ |
| E3 | Lançar **Empregos no turismo**, **Outubro/2026**, valor `2.250`, e abrir "Últimos lançamentos" em `/admin` | Aparece na primeira linha, e "Lançado por" mostra **Ana Editora** | ☐ |
| E4 | Abrir "Publicar relatório" | Pode publicar e editar, mas **não aparece** a opção de excluir | ☐ |

---

## Limitações conhecidas (não são erros)

Ainda dependem do front e estão fora deste roteiro:

- Os botões de categoria do dashboard (Restaurantes, Picos, Festas…) ainda não filtram nada.
- O carrossel "Próximos eventos" do dashboard mostra eventos fixos no código, e não os da API (o C12 mostra que a API já tem os dados).
- "Ver envios →" no painel e "Ver agenda completa →" no dashboard levam a páginas que ainda não existem (`/admin/envios` e `/eventos`).
- "Esqueceu sua senha?" e "Entenda os dados" ainda não fazem nada.

## Registro de execução

| Data | Quem testou | Passos com problema | Observações |
|---|---|---|---|
| | | | |

# Roteiro de testes de ponta a ponta
 
Passo a passo para testar o sistema inteiro pelas telas, como um usuário faria.
Cada passo diz **o que fazer** e **o que deve aparecer**. Os números esperados batem com os dados de demonstração do seed (`backend/prisma/seed.ts`).
 
Se algo não bater, anote o código do passo (ex.: `D3`) e o que apareceu.
 
---
 
## 0. Preparação
 
Comece sempre de um banco limpo, para os números baterem.
 
**Pelo Docker (recomendado):** sobe banco, API e site e já roda o seed.
 
```bash
docker compose --profile completo down -v        # APAGA os dados do Docker
docker compose --profile completo up -d --build  # site em http://localhost:3000
docker compose --profile completo ps             # os 3 containers "healthy"
```
 
**Sem Docker, para desenvolver** (com um MySQL ligado):
 
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
| Inventário | 9 itens (5 lugares com informações de visita: Mirante do Santo Cruzeiro, Santuário de Santa Rita, Inatel, Campão e Bloco do Urso), 1 sem revisão há mais de 12 meses |
 
> Os passos assumem que você está testando em **outubro/2026 ou depois**. Outubro/2026 ainda não tem dados lançados.
 
---
 
## 1. Home (`/`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| H1 | Abrir `http://localhost:3000` | Título "Observatório de Turismo SRS", carrossel com 4 fotos, logos institucionais e rodapé | ☐ |
| H2 | Olhar os contadores do card "O Vale da Eletrônica" | **7** Indicadores · **3** Relatórios · **5** Setores | ☐ |
| H3 | Desligar a API (Ctrl+C no terminal do backend) e recarregar | Os contadores mostram "—" e a página não quebra. Ligue a API de novo | ☐ |
| H4 | Clicar em "Ver dashboard", "Ver relatórios", "Sou um estabelecimento", "Cadastur e FNRH" e "Login ADM" | Abrem `/dashboard`, `/relatorios`, `/coleta`, `/cadastur` e `/login` | ☐ |
| H5 | Olhar a aba do navegador | Ícone do Observatório (lupa roxa) e o título "Observatório do Turismo de Santa Rita do Sapucaí" | ☐ |
 
## 2. Dashboard público (`/dashboard`)
 
Ao abrir, o período vem de 01/01 do ano atual até hoje.
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| D1 | Abrir `/dashboard` | Aparece "Atualizado em …" com a data em que o seed rodou, e 7 cards (tabela abaixo) | ☐ |
| D2 | Conferir os cards | Valores da tabela abaixo | ☐ |
| D3 | Olhar o gráfico "Evolução mensal de visitantes" | Linha de janeiro até o mês atual. **Os meses depois de Set/2026 ficam sem ponto** (sem dado). Abaixo: "167.100 visitantes no período, com pico em Set/2026 (29.600)." | ☐ |
| D4 | Passar o mouse sobre o selo de variação de um card | Mostra "Comparado a …" (ex.: "Comparado a Jan–Set/2025") | ☐ |
| D5 | Mudar o período para **01/07/2026 até 30/09/2026** | Visitantes: **76.600**, ↗ +10,7%, "total de Jul–Set/2026". Taxa de ocupação: **77%**, ↗ +5,5% | ☐ |
| D6 | Mudar o período para **01/01/2025 até 31/12/2025** | Visitantes: **209.100**, com o selo "**sem comparação**" (não há dados de 2024) | ☐ |
| D7 | Mudar o período para **01/01/2024 até 31/12/2024** | Cards com "—" e "sem dados no período selecionado". Gráfico: "Sem dados de visitantes para o período selecionado." | ☐ |
| D8 | Desligar a API e mudar o período | Aparece uma mensagem de erro em vermelho. Ligue a API de novo | ☐ |
| D9 | Voltar ao período padrão e conferir os botões de setor | **Visão geral, Empregos, Empresas, Hospedagem, Leitos, Visitantes** (vêm do banco) | ☐ |
| D10 | Clicar em **Hospedagem** | Só 3 cards: Hóspedes, Meios de hospedagem e Taxa de ocupação. O gráfico passa a ser "Evolução mensal: …" do primeiro indicador com dados. **Visão geral** volta aos 7 cards | ☐ |
| D11 | Rolar até "Próximos eventos em Santa Rita do Sapucaí" | 4 eventos: Natal Iluminado, Carnaval de Santa Rita, Festival de Inverno de Santa Rita e Feira de Eletrônica e Inovação. A Semana do Turismo (já terminou) **não** aparece | ☐ |
| D12 | Na busca de lugares, digitar `cruzeiro` | Aparece "Mirante do Santo Cruzeiro". Buscar também `SANTUARIO` (sem acento), `inatel`, `campão` e `urso`: cada um encontra o seu lugar | ☐ |
| D13 | Buscar `xyz` | Nenhum lugar encontrado, sem quebrar a página | ☐ |
 
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
 
> Hóspedes vai só até agosto porque setembro ainda está **pendente de análise** (seção 9). Mesmo com o período indo até outubro, o card considera só os meses com dado. Isso é proposital: mês sem dado não conta como zero.
 
## 3. Página do lugar (`/lugares/[id]`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| G1 | Na busca do dashboard, abrir **Santuário de Santa Rita de Cássia (Igreja Matriz)** | Página do lugar com "Sobre o lugar", endereço (Praça Santa Rita, s/n – Centro), "Horário de funcionamento" (horários das missas), "Melhor horário para visitar" e "Época mais movimentada" | ☐ |
| G2 | Clicar no Instagram | Abre `instagram.com/santuario_santarita_srs` numa nova aba | ☐ |
| G3 | Abrir **Mirante do Santo Cruzeiro** | Sem Instagram cadastrado: o campo mostra "Não informado" | ☐ |
| G4 | Abrir `/lugares/999999` | "Lugar não encontrado" e "Ele pode ter sido removido do inventário." | ☐ |
 
## 4. Relatórios públicos (`/relatorios`)
 
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
 
## 5. Login (`/login`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| L1 | Abrir `/admin` sem estar logado | Vai para `/login` | ☐ |
| L2 | Entrar com `admin@observatorio.local` e senha `errada` | "E-mail ou senha incorretos." | ☐ |
| L3 | Entrar com um e-mail que não existe | A **mesma** mensagem do L2 (não revela se o e-mail existe) | ☐ |
| L4 | Clicar no olho do campo senha | A senha aparece e some. Embaixo do campo: "Esqueceu a senha? Fale com o administrador" | ☐ |
| L5 | Entrar com `ADMIN@observatorio.local` / `admin123` | Entra (o e-mail não diferencia maiúsculas) e abre `/admin` | ☐ |
| L6 | Sair, entrar **desmarcando** "Lembrar de mim", fechar a aba e abrir `/admin` numa aba nova | Pede login de novo | ☐ |
| L7 | Logado, abrir as Ferramentas do desenvolvedor (F12) → Application → Local Storage (ou Session Storage, se entrou sem "Lembrar de mim"), trocar o valor de `token` por `abc` e recarregar | Vai para o login com "Sua sessão expirou. Entre novamente para continuar." | ☐ |
| L8 | **Faça este por último:** errar a senha várias vezes seguidas e depois tentar com a senha certa | Depois de 10 erros em 15 minutos (os do L2 e L3 contam), aparece "Muitas tentativas de login. Aguarde 15 minutos e tente de novo.", **mesmo com a senha certa**. Para liberar antes, reinicie a API | ☐ |
 
## 6. Painel administrativo (`/admin`), logado como ADMIN
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| A1 | Entrar como ADMIN | "Olá, Equipe" e "Dados atualizados em …". No menu: Equipe SMCELT, com o selo **Administrador**, e os itens Visão geral, Lançar valores, Publicar relatório, Indicadores, Envios, Estabelecimentos, Eventos, Inventário turístico, Usuários e Minha conta | ☐ |
| A2 | Conferir os 4 números | **2** envios de hotéis aguardando análise (card destacado em amarelo) · **3** relatórios publicados · **7** indicadores ativos · **1** item do inventário sem revisão há mais de 12 meses | ☐ |
| A3 | Olhar "Últimos lançamentos" | Tabela com 5 linhas (indicador, mês, valor, lançado por, atualizado em) | ☐ |
| A4 | Clicar em "Ver no dashboard →" | Abre `/dashboard` | ☐ |
| A4b | Voltar e clicar em "Ver envios →" no card de envios | Abre `/admin/envios` | ☐ |
| A5 | Clicar em "Ver site público ↗" no menu | Abre a home numa nova aba | ☐ |
| A6 | Reduzir a janela para largura de celular | Aparece a barra superior com o botão ☰. Ele abre o menu em gaveta, que fecha no X ou clicando fora | ☐ |
| A7 | Clicar em **Sair** | Volta para `/login`. Abrir `/admin` de novo pede login | ☐ |
 
## 7. Lançar valores (`/admin/lancar`)
 
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
 
## 8. Publicar relatório (`/admin/publicar`)
 
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
 
## 9. Área do estabelecimento (`/coleta`)
 
Abra numa **janela anônima**, sem estar logado: é a página que os hotéis e as pousadas usam.
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| C1 | Abrir `/coleta` e clicar em "Entrar" sem digitar nada | "Digite o código completo, como CENT-2026." | ☐ |
| C2 | Digitar `XXXX-0000` | "Código de acesso inválido." | ☐ |
| C3 | Digitar `cent 2026` (minúsculas e espaço) | Entra do mesmo jeito: Hotel Exemplo Centro (fictício) | ☐ |
| C4 | Conferir "O que você vai informar" e "Seus envios" | Indicadores liberados: Hóspedes, Leitos disponíveis e Taxa de ocupação. Envios: hóspedes de Set/2026 **Aguardando análise** e ocupação de Set/2026 **Rejeitado**, com o motivo "A taxa de ocupação não pode passar de 100%…" | ☐ |
| C5 | Taxa de ocupação, Setembro/2026, valor `108` | "Uma porcentagem não pode passar de 100." | ☐ |
| C6 | Valor `-5` | "O valor não pode ser negativo." | ☐ |
| C7 | Valor `86` e clicar em "Enviar" | "Enviado! Taxa de ocupação de …: 86%. Agora é só aguardar a análise da SMCELT." O envio aparece em "Seus envios" como **Aguardando análise** | ☐ |
| C8 | Enviar de novo o mesmo mês | "Já existe um envio deste mês aguardando análise da SMCELT." | ☐ |
 
## 10. Análise dos envios (`/admin/envios`), logado como ADMIN
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| N1 | Abrir `/admin` | Card de envios aguardando análise com **3**, destacado em amarelo | ☐ |
| N2 | Abrir **Envios** | Abas **Pendentes (3)**, **Aprovados (1)** e **Rejeitados (1)**. Os pendentes vêm do mais antigo para o mais novo: hotel (hóspedes), pousada (hóspedes), hotel (ocupação) | ☐ |
| N3 | Clicar em **Aprovar** nos dois envios de hóspedes | Saem de Pendentes e vão para Aprovados. No dashboard, Hóspedes passa a **21.570**, "total de **Jan–Set**/2026" | ☐ |
| N4 | Clicar em **Rejeitar** no envio de ocupação e confirmar sem escrever o motivo | "Explique o motivo da rejeição." | ☐ |
| N5 | Escrever `Valor acima do esperado, confira.` e rejeitar | Vai para Rejeitados. Na `/coleta`, com `CENT-2026`, o envio aparece como **Rejeitado** com esse motivo | ☐ |
| N6 | Abrir `/admin` | Envios aguardando análise: **0** (card sem destaque) | ☐ |
 
## 11. Indicadores (`/admin/indicadores`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| I1 | Abrir a tela | 7 indicadores agrupados por setor (Empregos, Empresas, Hospedagem, Leitos, Visitantes), cada um com unidade, forma de cálculo (Soma, Média ou Último valor) e o selo **Ativo** | ☐ |
| I2 | Clicar em "Cadastrar" sem preencher | Erros embaixo de Nome, Setor e Unidade | ☐ |
| I3 | Cadastrar `Turistas estrangeiros`, setor `Visitantes`, unidade `pessoas` | Aparece no grupo VISITANTES. No dashboard, aparece um card novo com "—" (sem dados), e o gráfico continua mostrando Visitantes | ☐ |
| I4 | Cadastrar de novo o mesmo nome no mesmo setor | "Já existe um indicador com este nome neste setor." | ☐ |
| I5 | Clicar em **Desativar** no indicador novo | Selo **Inativo**. Ele some do dashboard e de Lançar valores. **Ativar** traz de volta | ☐ |
| I6 | Editar (lápis) e trocar "Como somar os meses" para **Média** | Aparece o aviso de que os totais do dashboard mudam. Salvar mostra "Média" na lista | ☐ |
| I7 | Excluir (lixeira) e confirmar | O aviso diz que os valores lançados também são apagados e oferece **Desativar**. Depois de excluir, o indicador some da lista | ☐ |
 
## 12. Estabelecimentos (`/admin/estabelecimentos`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| S1 | Abrir a tela | Hotel Exemplo Centro e Pousada Exemplo da Serra, os dois **Com código de acesso** | ☐ |
| S2 | Clicar em "Cadastrar" sem preencher | "Informe o nome do estabelecimento." e "Informe a categoria (ex.: Hotel)." | ☐ |
| S3 | Cadastrar `Pousada Teste`, categoria `Pousada` | Aparece na lista com o selo **Sem código de acesso** | ☐ |
| S4 | Clicar em **Gerar código** e confirmar | Mostra o código uma única vez, com "Copiar código" e o aviso para repassar ao estabelecimento. O selo muda para **Com código de acesso** | ☐ |
| S5 | Entrar em `/coleta` com o código gerado | Entra como Pousada Teste | ☐ |
| S6 | Excluir a Pousada Teste | Some da lista. Tentar excluir o Hotel Exemplo Centro dá erro, porque ele tem valores publicados | ☐ |
 
## 13. Eventos (`/admin/eventos`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| T1 | Abrir a tela | Abas **Próximos (6)** e **Já realizados (1)**. A Semana do Turismo fica em Já realizados | ☐ |
| T2 | Clicar em "+ Novo evento" e salvar sem preencher | "Informe o nome do evento.", "Informe a data de início." e "Informe o local." | ☐ |
| T3 | Data final antes da inicial | "A data final não pode ser antes da inicial." | ☐ |
| T4 | Criar `Festival de Teste` daqui a 10 dias, local `Praça Central`, gratuito | Aparece em Próximos com o selo "Gratuito". No dashboard, entra em "Próximos eventos" (é o mais próximo) | ☐ |
| T5 | Editar e depois excluir o evento | As mudanças aparecem na lista, e ele some depois de excluir | ☐ |
 
## 14. Inventário turístico (`/admin/inventario`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| U1 | Abrir a tela | 9 itens. Aviso de **1** item sem revisão há mais de 12 meses (Centro de Informações Turísticas), com o botão "Ver só esses" | ☐ |
| U2 | Clicar em **Marcar como revisado** no item atrasado | O selo muda para **Revisado** e o aviso some, sem recarregar a página | ☐ |
| U3 | Buscar `inatel` e filtrar por tipo **Equipamento** | A busca encontra o Inatel. O filtro mostra só o restaurante e o hotel | ☐ |
| U4 | Clicar em "Novo lugar" e cadastrar `Lugar Teste`, categoria `Mirante`, Instagram `bloco do urso` | "Use só o nome do perfil, ex.: @inatel" | ☐ |
| U5 | Trocar o Instagram para `https://instagram.com/teste/` e salvar | Cadastra. Na edição, o Instagram aparece como `@teste` | ☐ |
| U6 | Clicar em "Ver página ↗" do Lugar Teste | Abre a página pública do lugar. Ele também aparece na busca do dashboard | ☐ |
| U7 | Excluir o Lugar Teste | Some do inventário e da busca do dashboard | ☐ |
 
## 15. Usuários (`/admin/usuarios`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| W1 | Abrir a tela | Equipe SMCELT (Administrador) e Ana Editora (Editor) | ☐ |
| W2 | "Novo usuário" com e-mail `ana@` e senha `123` | "Informe um e-mail válido." e "A senha precisa ter pelo menos 6 caracteres." | ☐ |
| W3 | Criar `Teste` / `teste@observatorio.local` / `teste123`, papel Editor | Aparece na lista como Editor. Entrar com ele funciona | ☐ |
| W4 | Criar outro com o mesmo e-mail | "Já existe um usuário com este e-mail." | ☐ |
| W5 | Editar o próprio usuário (Equipe SMCELT) | "Você não pode alterar o seu próprio papel." | ☐ |
| W6 | Remover a Ana Editora | "Este usuário tem lançamentos ou relatórios publicados e não pode ser removido." | ☐ |
| W7 | Remover o usuário Teste | Some da lista | ☐ |
 
## 16. Minha conta (`/admin/conta`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| M1 | Abrir a tela | Nome, e-mail e o selo do papel de quem está logado | ☐ |
| M2 | Nova senha `12345` | "A nova senha precisa ter pelo menos 6 caracteres." | ☐ |
| M3 | Nova senha igual à atual | "A nova senha precisa ser diferente da atual." | ☐ |
| M4 | Confirmação diferente da nova senha | "As senhas não são iguais." | ☐ |
| M5 | Senha atual `admin123`, nova `admin456` | "Senha trocada. Use a nova senha no próximo login." Sair e entrar com `admin456` funciona. **Volte para `admin123`** | ☐ |
 
## 17. Cadastur e FNRH Digital (`/cadastur`)
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| K1 | Abrir `/cadastur` | Seção **Cadastur** (obrigatório para, opcional para e como fazer) e seção **FNRH Digital** | ☐ |
| K2 | Clicar no link para o site do Cadastur | Abre `cadastur.turismo.gov.br` | ☐ |
 
## 18. Usuário EDITOR
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| E1 | Sair e entrar com `editor@observatorio.local` / `editor123` | "Olá, Ana". No menu: Ana Editora, com o selo **Editor** | ☐ |
| E2 | Abrir "Lançar valores" | Pode lançar e **editar**, mas **não aparece** o botão Excluir | ☐ |
| E3 | Lançar **Empregos no turismo**, **Outubro/2026**, valor `2.250`, e abrir "Últimos lançamentos" em `/admin` | Aparece na primeira linha, e "Lançado por" mostra **Ana Editora** | ☐ |
| E4 | Abrir "Publicar relatório" | Pode publicar e editar, mas **não aparece** a opção de excluir | ☐ |
| E5 | Olhar o menu | **Não** aparece o item Usuários | ☐ |
| E6 | Abrir `/admin/usuarios` direto pela barra de endereço | "Acesso restrito" e "Só administradores podem gerenciar os usuários do painel." | ☐ |
| E7 | Abrir Indicadores, Estabelecimentos, Eventos e Inventário | Pode cadastrar e editar, mas **não aparece** a lixeira. Em Estabelecimentos, também não aparece "Gerar código" | ☐ |
| E8 | Abrir Envios | Pode aprovar e rejeitar | ☐ |
 
## 19. Celular
 
Com o painel aberto, aperte **F12** e depois **Ctrl+Shift+M**, e escolha um celular (ex.: iPhone 12 Pro).
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| X1 | Passar por Home, Dashboard (com os filtros), Relatórios, página de um lugar, Coleta e Cadastur | Nenhuma página "vaza" para a direita (sem rolagem lateral) e nada fica cortado | ☐ |
| X2 | No painel, abrir o menu ☰ e passar por todas as telas | O menu abre e fecha. Formulários, listas e janelas (modais) cabem na tela | ☐ |
 
## 20. Testes automáticos
 
Com o banco ligado (pelo Docker ou local):
 
```bash
cd backend && npm test   # 166 testes: unitários e de integração da API
cd front && npm test     # 61 testes: formatação e validações das telas
```
 
| # | O que fazer | Resultado esperado | OK |
|---|---|---|---|
| Z1 | `npm test` no backend | `Tests 166 passed` | ☐ |
| Z2 | `npm test` no front | `Tests 61 passed` | ☐ |
 
> Em computadores lentos, algum teste de integração pode passar do limite de 15 segundos. Rode `npx vitest run --testTimeout=60000` no backend.
 
---
 
## Limitações conhecidas (não são erros)
 
- O botão "Entenda os dados" do dashboard ainda não abre nenhuma explicação.
- Não há recuperação de senha por e-mail: quem esquece a senha pede a um administrador, que a redefine em Usuários.
- O sistema não está publicado na internet. A publicação é opcional nesta entrega, e o projeto já tem o pipeline de deploy pronto (veja `docs/deploy.md`).
## Registro de execução
 
| Data | Quem testou | Passos com problema | Observações |
|---|---|---|---|
| 10/11/2026 | Clara | Nenhum | Seções 0 a 8 no Docker (Home, relatórios, login, painel, lançar valores e publicar relatório, incluindo o PDF que continua disponível depois de reiniciar a API). Também conferiu a correção do healthcheck do MySQL (PR #31) e os testes do painel (PR #32) |
| 10/11/2026 | Clara | I3 (corrigido) | Na tela de indicadores (PR #33), um indicador recém-cadastrado e sem dados deixava o gráfico de Visitantes vazio. Corrigido no próprio PR #33: o gráfico passa a dar preferência a indicadores com dados |
| 12/11/2026 | Maria Eduarda | Nenhum | Seções 18 e 19 no Codespaces: usuário editor em todas as telas do painel, inclusive Indicadores, e celular. Também conferiu os dados reais dos 5 lugares na busca do dashboard e na página do lugar (PR #35) |
| 13/11/2026 | Maria Eduarda | Z1 (resolvido) | Teste completo do zero pelo Docker, com os 3 containers healthy, e testes automáticos depois dos PRs #36 a #39. Front: 61 testes passando. Back-end: 1 teste passou do limite de 15 s por lentidão do computador; com `--testTimeout=60000`, os 166 passaram |
| | | | |
 

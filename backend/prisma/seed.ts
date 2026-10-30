/**
 * Popula o banco com os usuários de teste e dados de EXEMPLO.
 * ATENÇÃO: todos os valores abaixo são FICTÍCIOS, apenas para desenvolver,
 * testar e demonstrar o sistema. Antes de usar com dados reais da SMCELT,
 * apague-os pelo painel ou recrie o banco sem rodar o seed.
 *
 * O roteiro de testes (docs/roteiro-de-testes.md) usa exatamente estes dados.
 *
 * Rodar: npm run db:seed
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { hashCodigo } from "../src/lib/codigo-acesso.js";
import { prisma } from "../src/lib/prisma.js";
import { PASTA_UPLOADS } from "../src/routes/relatorios.routes.js";
import { Agregacao } from "../src/generated/prisma/enums.js";

const indicadoresBase = [
  { nome: "Visitantes", categoria: "Visitantes", unidade: "pessoas", agregacao: Agregacao.SOMA,
    descricao: "Estimativa de visitantes no mês" },
  { nome: "Meios de hospedagem", categoria: "Hospedagem", unidade: "estabelecimentos", agregacao: Agregacao.ULTIMO,
    descricao: "Hotéis e pousadas em funcionamento" },
  { nome: "Taxa de ocupação", categoria: "Hospedagem", unidade: "%", agregacao: Agregacao.MEDIA,
    descricao: "Ocupação média da rede hoteleira" },
  { nome: "Leitos disponíveis", categoria: "Leitos", unidade: "leitos", agregacao: Agregacao.ULTIMO,
    descricao: "Total de leitos ofertados" },
  { nome: "Empresas do setor", categoria: "Empresas", unidade: "empresas", agregacao: Agregacao.ULTIMO,
    descricao: "Empreendimentos turísticos ativos" },
  { nome: "Empregos no turismo", categoria: "Empregos", unidade: "postos", agregacao: Agregacao.ULTIMO,
    descricao: "Postos de trabalho formais no setor" },
];

// Valores fictícios por mês (índice 0 = janeiro)
const ficticios: Record<string, { 2025: number[]; 2026: number[] }> = {
  Visitantes: {
    2025: [9800, 12100, 13900, 13000, 15800, 17900, 23500, 19600, 26100, 18900, 15800, 22700],
    2026: [10500, 13500, 15200, 14200, 17300, 19800, 25800, 21200, 29600],
  },
  "Meios de hospedagem": {
    2025: [38, 38, 38, 39, 39, 39, 40, 40, 40, 40, 41, 41],
    2026: [41, 41, 42, 42, 42, 43, 43, 43, 44],
  },
  "Taxa de ocupação": {
    2025: [52, 58, 61, 57, 60, 63, 74, 66, 79, 62, 58, 70],
    2026: [55, 61, 64, 60, 64, 67, 78, 70, 83],
  },
  "Leitos disponíveis": {
    2025: [980, 980, 990, 990, 1010, 1010, 1030, 1030, 1040, 1040, 1050, 1050],
    2026: [1060, 1060, 1075, 1075, 1090, 1090, 1110, 1110, 1120],
  },
  "Empresas do setor": {
    2025: [262, 263, 265, 266, 268, 270, 271, 272, 273, 274, 275, 276],
    2026: [277, 278, 279, 280, 281, 282, 284, 285, 286],
  },
  "Empregos no turismo": {
    2025: [1890, 1905, 1920, 1915, 1940, 1960, 2010, 1995, 2050, 2030, 2020, 2080],
    2026: [2060, 2075, 2090, 2085, 2110, 2130, 2190, 2170, 2230],
  },
};

// "Hóspedes" vem SÓ dos estabelecimentos (não tem valor do município), então aprovar
// um envio da coleta muda o dashboard na hora. Setembro/2026 está pendente de análise.
const HOTEL = "Hotel Exemplo Centro (fictício)";
const POUSADA = "Pousada Exemplo da Serra (fictícia)";
const hospedes: Record<string, { 2025: number[]; 2026: number[] }> = {
  [HOTEL]: {
    2025: [1180, 1420, 1610, 1500, 1790, 1980, 2450, 2120, 2690, 2050, 1760, 2380],
    2026: [1250, 1530, 1720, 1610, 1920, 2140, 2630, 2270],
  },
  [POUSADA]: {
    2025: [210, 260, 300, 280, 330, 380, 520, 430, 560, 400, 330, 470],
    2026: [230, 280, 320, 300, 350, 410, 560, 460],
  },
};

const mes = (ano: number, m: number) => new Date(Date.UTC(ano, m, 1));

// Gera um PDF simples de uma página, só com texto (para os relatórios de exemplo)
function pdfDeExemplo(titulo: string, linhas: string[]): Buffer {
  const texto = (t: string) => `(${t.replace(/[–—]/g, "-").replace(/[\\()]/g, (c) => `\\${c}`)}) Tj`;
  const conteudo = [
    "BT /F1 16 Tf 56 770 Td",
    texto(titulo),
    "/F1 11 Tf 0 -30 Td",
    ...linhas.flatMap((l) => [texto(l), "0 -16 Td"]),
    "ET",
  ].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const posicoes: number[] = [];
  objetos.forEach((o, i) => {
    posicoes.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, "latin1");
  pdf +=
    `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` +
    posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@observatorio.local").toLowerCase();
  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: process.env.ADMIN_NOME ?? "Equipe SMCELT",
      email,
      senhaHash: await bcrypt.hash(process.env.ADMIN_SENHA ?? "admin123", 10),
      papel: "ADMIN",
    },
  });
  console.log(`✔ Admin: ${admin.email}`);

  // EDITOR: lança, edita e analisa envios, mas não apaga nada nem gerencia usuários
  const editor = await prisma.usuario.upsert({
    where: { email: "editor@observatorio.local" },
    update: {},
    create: {
      nome: "Ana Editora",
      email: "editor@observatorio.local",
      senhaHash: await bcrypt.hash("editor123", 10),
      papel: "EDITOR",
    },
  });
  console.log(`✔ Editor: ${editor.email}`);

  for (const base of indicadoresBase) {
    const indicador = await prisma.indicador.upsert({
      where: { nome_categoria: { nome: base.nome, categoria: base.categoria } },
      update: {},
      create: base,
    });

    const jaTemDados = await prisma.registroIndicador.count({ where: { indicadorId: indicador.id } });
    if (jaTemDados) continue;

    const dados = ficticios[base.nome];
    const linhas = ([2025, 2026] as const).flatMap((ano) =>
      dados[ano].map((valor, m) => ({
        indicadorId: indicador.id,
        estabelecimentoId: null, // valor consolidado do município
        usuarioId: admin.id,
        valor,
        periodo: mes(ano, m),
      })),
    );
    await prisma.registroIndicador.createMany({ data: linhas });
    console.log(`✔ ${base.nome}: ${linhas.length} registros fictícios`);
  }

  if ((await prisma.estabelecimento.count()) === 0) {
    await prisma.estabelecimento.createMany({
      data: [
        { nome: HOTEL, categoria: "Hotel", regiao: "Centro" },
        { nome: POUSADA, categoria: "Pousada", regiao: "Zona rural" },
      ],
    });
    console.log("✔ Estabelecimentos de exemplo");
  }

  // ---- Coleta pelos estabelecimentos ----
  // Indicadores que os próprios hotéis e pousadas podem enviar
  await prisma.indicador.updateMany({
    where: { nome: { in: ["Taxa de ocupação", "Leitos disponíveis"] } },
    data: { coletaEstabelecimento: true },
  });
  // Códigos de TESTE (no uso real, a SMCELT gera pela rota POST /api/estabelecimentos/:id/codigo)
  const codigosTeste = [
    { nome: HOTEL, codigo: "CENT-2026" },
    { nome: POUSADA, codigo: "SERR-2026" },
  ];
  for (const { nome, codigo } of codigosTeste) {
    await prisma.estabelecimento.updateMany({
      where: { nome, codigoAcessoHash: null },
      data: { codigoAcessoHash: hashCodigo(codigo) },
    });
  }
  console.log("✔ Coleta: códigos de teste CENT-2026 (hotel) e SERR-2026 (pousada)");

  const hotel = await prisma.estabelecimento.findFirst({ where: { nome: HOTEL } });
  const pousada = await prisma.estabelecimento.findFirst({ where: { nome: POUSADA } });
  const indicadorHospedes = await prisma.indicador.upsert({
    where: { nome_categoria: { nome: "Hóspedes", categoria: "Hospedagem" } },
    update: {},
    create: {
      nome: "Hóspedes",
      categoria: "Hospedagem",
      unidade: "hóspedes",
      agregacao: Agregacao.SOMA,
      descricao: "Hóspedes recebidos pelos estabelecimentos que participam da coleta",
      coletaEstabelecimento: true,
    },
  });

  if (hotel && pousada && (await prisma.registroIndicador.count({ where: { indicadorId: indicadorHospedes.id } })) === 0) {
    const linhas = [hotel, pousada].flatMap((e) =>
      ([2025, 2026] as const).flatMap((ano) =>
        hospedes[e.nome][ano].map((valor, m) => ({
          indicadorId: indicadorHospedes.id,
          estabelecimentoId: e.id,
          usuarioId: admin.id,
          valor,
          periodo: mes(ano, m),
        })),
      ),
    );
    await prisma.registroIndicador.createMany({ data: linhas });
    console.log(`✔ Hóspedes: ${linhas.length} registros fictícios dos estabelecimentos`);
  }

  // Envios da coleta nos três estados, para a fila de análise não começar vazia
  const ocupacao = await prisma.indicador.findFirst({ where: { nome: "Taxa de ocupação" } });
  if (hotel && pousada && ocupacao && (await prisma.submissao.count()) === 0) {
    const agosto = mes(2026, 7);
    const setembro = mes(2026, 8);

    // Aprovado: é o valor de agosto/2026 da pousada que já está publicado
    const registroAgosto = await prisma.registroIndicador.findFirst({
      where: { indicadorId: indicadorHospedes.id, estabelecimentoId: pousada.id, periodo: agosto },
    });
    if (registroAgosto) {
      await prisma.submissao.create({
        data: {
          estabelecimentoId: pousada.id, indicadorId: indicadorHospedes.id, valor: registroAgosto.valor, periodo: agosto,
          status: "APROVADA", enviadoEm: new Date("2026-09-03T14:10:00Z"),
          analisadoEm: new Date("2026-09-04T12:00:00Z"), analisadoPorId: admin.id, registroId: registroAgosto.id,
        },
      });
    }
    await prisma.submissao.createMany({
      data: [
        // Rejeitado: taxa acima de 100% (o hotel pode corrigir e reenviar)
        { estabelecimentoId: hotel.id, indicadorId: ocupacao.id, valor: 108, periodo: setembro,
          status: "REJEITADA", enviadoEm: new Date("2026-10-02T13:20:00Z"),
          analisadoEm: new Date("2026-10-03T11:30:00Z"), analisadoPorId: editor.id,
          motivoRejeicao: "A taxa de ocupação não pode passar de 100%. Confira o cálculo e envie de novo." },
        // Pendentes: hóspedes de setembro/2026 aguardando análise
        { estabelecimentoId: hotel.id, indicadorId: indicadorHospedes.id, valor: 2980, periodo: setembro,
          observacao: "Movimento maior por causa da Semana do Turismo.", enviadoEm: new Date("2026-10-05T16:45:00Z") },
        { estabelecimentoId: pousada.id, indicadorId: indicadorHospedes.id, valor: 610, periodo: setembro,
          enviadoEm: new Date("2026-10-07T09:15:00Z") },
      ],
    });
    console.log("✔ Coleta: 2 envios pendentes, 1 aprovado e 1 rejeitado");
  }

  if ((await prisma.relatorio.count()) === 0) {
    fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
    const relatorios = [
      { titulo: "Boletim do Turismo – 1º semestre de 2026", ano: 2026, publicadoEm: new Date("2026-07-20T15:00:00Z"),
        arquivoNome: "boletim-1-semestre-2026.pdf",
        descricao: "Visitantes, ocupação hoteleira, leitos e empregos de janeiro a junho de 2026, comparados ao mesmo período de 2025." },
      { titulo: "Anuário do Turismo 2025", ano: 2025, publicadoEm: new Date("2026-02-10T15:00:00Z"),
        arquivoNome: "anuario-turismo-2025.pdf",
        descricao: "Balanço do ano de 2025: fluxo de visitantes mês a mês, rede hoteleira e empresas do setor." },
      { titulo: "Perfil do visitante – Festival de Inverno 2025", ano: 2025, publicadoEm: new Date("2025-08-15T15:00:00Z"),
        arquivoNome: "perfil-visitante-festival-inverno-2025.pdf",
        descricao: "Pesquisa com visitantes do festival: origem, tempo de permanência e gastos." },
    ];
    for (const r of relatorios) {
      const arquivo = pdfDeExemplo(r.titulo, [
        "Observatório do Turismo de Santa Rita do Sapucaí",
        "",
        r.descricao,
        "",
        "DOCUMENTO DE EXEMPLO - todos os dados são fictícios.",
      ]);
      const arquivoPath = `${randomUUID()}.pdf`;
      fs.writeFileSync(path.join(PASTA_UPLOADS, arquivoPath), arquivo);
      await prisma.relatorio.create({
        data: { ...r, arquivoPath, tamanhoBytes: arquivo.length, usuarioId: admin.id },
      });
    }
    console.log(`✔ Relatórios de exemplo: ${relatorios.length} PDFs em uploads/`);
  }

  if ((await prisma.evento.count()) === 0) {
    const d = (iso: string) => new Date(iso);
    await prisma.evento.createMany({
      data: [
        // Já terminou: não aparece em /api/eventos?futuros=true
        { nome: "Semana do Turismo", dataInicio: d("2026-09-21"), dataFim: d("2026-09-27"),
          local: "Centro de Informações Turísticas", contato: "SMCELT", gratuito: true, icone: "🧭" },
        { nome: "Natal Iluminado", dataInicio: d("2026-12-04"), dataFim: d("2026-12-25"),
          local: "Praça Santa Rita", contato: "SMCELT", gratuito: true, icone: "🎄" },
        { nome: "Carnaval de Santa Rita", dataInicio: d("2027-02-05"), dataFim: d("2027-02-09"),
          local: "Ruas do Centro", contato: "SMCELT", gratuito: true, icone: "🎭" },
        { nome: "Festival de Inverno de Santa Rita", dataInicio: d("2027-07-12"), dataFim: d("2027-07-14"),
          local: "Praça Central", contato: "@festivaldeinvernosrs", gratuito: true, icone: "🎵" },
        { nome: "Feira de Eletrônica e Inovação", dataInicio: d("2027-08-22"),
          local: "Inatel - Campus SRS", contato: "@inatel.oficial", gratuito: true, icone: "⚙" },
        { nome: "Encontro de Voo Livre na Serra", dataInicio: d("2027-09-05"),
          local: "Rampa do Zeza", contato: "voolivresrs", gratuito: false, icone: "🪂" },
        { nome: "Festa do Padroeiro", dataInicio: d("2027-10-03"), dataFim: d("2027-10-06"),
          local: "Igreja Matriz", contato: "@paroquiasrs", gratuito: true, icone: "✨" },
      ],
    });
    console.log("✔ Eventos de exemplo");
  }

  if ((await prisma.atrativo.count()) === 0) {
    await prisma.atrativo.createMany({
      data: [
        { nome: "Igreja Matriz de Santa Rita", tipo: "ATRATIVO", categoria: "Igreja", endereco: "Praça Santa Rita, Centro" },
        { nome: "Rampa do Zeza", tipo: "ATRATIVO", categoria: "Pico", descricao: "Rampa de voo livre com vista da cidade" },
        { nome: "Restaurante Exemplo (fictício)", tipo: "EQUIPAMENTO", categoria: "Restaurante" },
        { nome: HOTEL, tipo: "EQUIPAMENTO", categoria: "Hotel" },
        { nome: "Centro de Informações Turísticas (fictício)", tipo: "SERVICO", categoria: "Informação turística",
          // conferido há mais de 1 ano: aparece em /revisao-pendente
          revisadoEm: new Date("2025-01-15") },
      ],
    });
    console.log("✔ Inventário turístico de exemplo");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Popula o banco com o usuário admin e dados de EXEMPLO.
 * ATENÇÃO: todos os valores abaixo são FICTÍCIOS, apenas para desenvolver
 * e testar o front. Antes de apresentar à SMCELT, apague-os pelo painel
 * ou rode `npm run db:reset` sem o seed de exemplo.
 *
 * Rodar: npm run db:seed
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { hashCodigo } from "../src/lib/codigo-acesso.js";
import { prisma } from "../src/lib/prisma.js";
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
      dados[ano].map((valor, mes) => ({
        indicadorId: indicador.id,
        estabelecimentoId: null, // valor consolidado do município
        usuarioId: admin.id,
        valor,
        periodo: new Date(Date.UTC(ano, mes, 1)),
      })),
    );
    await prisma.registroIndicador.createMany({ data: linhas });
    console.log(`✔ ${base.nome}: ${linhas.length} registros fictícios`);
  }

  if ((await prisma.estabelecimento.count()) === 0) {
    await prisma.estabelecimento.createMany({
      data: [
        { nome: "Hotel Exemplo Centro (fictício)", categoria: "Hotel", regiao: "Centro" },
        { nome: "Pousada Exemplo da Serra (fictícia)", categoria: "Pousada", regiao: "Zona rural" },
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
    { nome: "Hotel Exemplo Centro (fictício)", codigo: "CENT-2026" },
    { nome: "Pousada Exemplo da Serra (fictícia)", codigo: "SERR-2026" },
  ];
  for (const { nome, codigo } of codigosTeste) {
    await prisma.estabelecimento.updateMany({
      where: { nome, codigoAcessoHash: null },
      data: { codigoAcessoHash: hashCodigo(codigo) },
    });
  }
  console.log("✔ Coleta: códigos de teste CENT-2026 (hotel) e SERR-2026 (pousada)");

  if ((await prisma.evento.count()) === 0) {
    const d = (iso: string) => new Date(iso);
    await prisma.evento.createMany({
      data: [
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
        { nome: "Hotel Exemplo Centro (fictício)", tipo: "EQUIPAMENTO", categoria: "Hotel" },
        { nome: "Centro de Informações Turísticas (fictício)", tipo: "SERVICO", categoria: "Informação turística",
          // conferido há mais de 1 ano: aparece em /revisao-pendente
          revisadoEm: new Date("2025-01-15") },
      ],
    });
    console.log("✔ Inventário turístico de exemplo");
  }

  // Mais itens do inventário (criados só se ainda não existirem), alguns com
  // revisão atrasada para o lembrete aparecer no painel
  const maisAtrativos = [
    { nome: "Mirante da Serra (fictício)", tipo: "ATRATIVO" as const, categoria: "Mirante",
      descricao: "Vista panorâmica da cidade", revisadoEm: new Date("2025-03-10") },
    { nome: "Pousada Exemplo da Serra (fictícia)", tipo: "EQUIPAMENTO" as const, categoria: "Pousada" },
    { nome: "Guia de Turismo Exemplo (fictício)", tipo: "SERVICO" as const, categoria: "Guia de turismo",
      contato: "(35) 0000-0000", revisadoEm: new Date("2024-11-20") },
    { nome: "Feira de Artesanato (fictícia)", tipo: "ATRATIVO" as const, categoria: "Feira",
      endereco: "Praça Central" },
  ];
  let novosAtrativos = 0;
  for (const a of maisAtrativos) {
    if (await prisma.atrativo.findFirst({ where: { nome: a.nome } })) continue;
    await prisma.atrativo.create({ data: a });
    novosAtrativos++;
  }
  if (novosAtrativos) console.log(`✔ Inventário: +${novosAtrativos} itens de exemplo`);

  // ---- Relatórios de exemplo (PDFs gerados aqui mesmo, em uploads/) ----
  if ((await prisma.relatorio.count()) === 0) {
    const pasta = path.resolve("uploads");
    await fs.mkdir(pasta, { recursive: true });
    const exemplos = [
      { titulo: "Boletim do Turismo - 2º trimestre 2026", ano: 2026, publicadoEm: "2026-07-15",
        descricao: "Visitantes, ocupação hoteleira e empregos de abril a junho de 2026." },
      { titulo: "Boletim do Turismo - 1º trimestre 2026", ano: 2026, publicadoEm: "2026-04-14",
        descricao: "Visitantes, ocupação hoteleira e empregos de janeiro a março de 2026." },
      { titulo: "Balanço do Turismo 2025", ano: 2025, publicadoEm: "2026-02-10",
        descricao: "Resumo anual dos indicadores turísticos de Santa Rita do Sapucaí." },
    ];
    for (const r of exemplos) {
      const pdf = pdfExemplo(r.titulo, [r.descricao, "Documento FICTÍCIO gerado pelo seed, apenas para testes."]);
      const arquivoPath = `${randomUUID()}.pdf`;
      await fs.writeFile(path.join(pasta, arquivoPath), pdf);
      await prisma.relatorio.create({
        data: {
          titulo: r.titulo,
          descricao: r.descricao,
          ano: r.ano,
          arquivoNome: `${r.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
                    arquivoPath,
          tamanhoBytes: pdf.length,
          publicadoEm: new Date(r.publicadoEm),
          usuarioId: admin.id,
        },
      });
    }
    console.log(`✔ Relatórios: ${exemplos.length} PDFs de exemplo`);
  }

  // ---- Envios dos estabelecimentos (para a tela de análise da SMCELT) ----
  if ((await prisma.submissao.count()) === 0) {
    const hotel = await prisma.estabelecimento.findFirst({ where: { nome: "Hotel Exemplo Centro (fictício)" } });
    const pousada = await prisma.estabelecimento.findFirst({ where: { nome: "Pousada Exemplo da Serra (fictícia)" } });
    const ocupacao = await prisma.indicador.findFirst({ where: { nome: "Taxa de ocupação" } });
    const leitos = await prisma.indicador.findFirst({ where: { nome: "Leitos disponíveis" } });
    if (hotel && pousada && ocupacao && leitos) {
      // Meses relativos à data de hoje: o seed nunca gera envio de mês futuro
      const hoje = new Date();
      const mesAtras = (n: number) => new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - n, 1));
      await prisma.submissao.createMany({
        data: [
          { estabelecimentoId: hotel.id, indicadorId: ocupacao.id, valor: 72, periodo: mesAtras(1),
            observacao: "Feriado prolongado aumentou a procura." },
          { estabelecimentoId: hotel.id, indicadorId: leitos.id, valor: 180, periodo: mesAtras(1) },
          { estabelecimentoId: pousada.id, indicadorId: ocupacao.id, valor: 64, periodo: mesAtras(1) },
          { estabelecimentoId: pousada.id, indicadorId: ocupacao.id, valor: 140, periodo: mesAtras(2),
            status: "REJEITADA", motivoRejeicao: "Taxa de ocupação acima de 100%. Confira e envie de novo.",
            analisadoEm: new Date(), analisadoPorId: admin.id },
        ],
      });
      console.log("✔ Coleta: 3 envios pendentes e 1 rejeitado de exemplo");
    }
  }
}

// Gera um PDF simples de uma página (só texto), sem biblioteca externa.
// Usado apenas para os relatórios de exemplo do seed.
function pdfExemplo(titulo: string, linhas: string[]): Buffer {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const texto = [
    "BT /F1 18 Tf 56 770 Td",
    `(${esc(titulo)}) Tj`,
    "/F1 12 Tf 0 -36 Td",
    ...linhas.flatMap((l) => [`(${esc(l)}) Tj`, "0 -20 Td"]),
    "(Observatório do Turismo de Santa Rita do Sapucaí) Tj",
    "ET",
  ].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const posicoes: number[] = [];
  objetos.forEach((obj, i) => {
    posicoes.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

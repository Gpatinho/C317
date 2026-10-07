/**
 * Popula o banco com o usuário admin e dados de EXEMPLO.
 * ATENÇÃO: todos os valores abaixo são FICTÍCIOS, apenas para desenvolver
 * e testar o front. Antes de apresentar à SMCELT, apague-os pelo painel
 * ou rode `npm run db:reset` sem o seed de exemplo.
 *
 * Rodar: npm run db:seed
 */
import bcrypt from "bcryptjs";
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

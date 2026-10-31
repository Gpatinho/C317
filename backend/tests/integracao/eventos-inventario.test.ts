import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { criarUsuario, diaRelativo } from "./helpers.js";

async function criarEvento(nome: string, dataInicio: string, dataFim?: string) {
  return prisma.evento.create({
    data: { nome, local: "Praça Central", dataInicio: new Date(dataInicio), dataFim: dataFim ? new Date(dataFim) : null },
  });
}

describe("GET /api/eventos", () => {
  it("futuros=true traz só o que não terminou, do mais próximo ao mais distante", async () => {
    await criarEvento("Já passou", diaRelativo(-10));
    await criarEvento("Terminou ontem", diaRelativo(-5), diaRelativo(-1));
    const emAndamento = await criarEvento("Em andamento", diaRelativo(-1), diaRelativo(2));
    const hoje = await criarEvento("Hoje", diaRelativo(0));
    const distante = await criarEvento("Daqui a um mês", diaRelativo(30));

    const res = await request(app).get("/api/eventos?futuros=true");
    expect(res.status).toBe(200);
    expect(res.body.map((e: { id: number }) => e.id)).toEqual([emAndamento.id, hoje.id, distante.id]);
  });

  it("limite corta a lista", async () => {
    for (let i = 1; i <= 5; i++) await criarEvento(`Evento ${i}`, diaRelativo(i));
    const res = await request(app).get("/api/eventos?futuros=true&limite=4");
    expect(res.body).toHaveLength(4);
  });
});

describe("POST/PUT /api/eventos", () => {
  it("cria com gratuito = true por padrão", async () => {
    const { auth } = await criarUsuario("EDITOR");
    const res = await request(app)
      .post("/api/eventos")
      .set(auth)
      .send({ nome: "Festival de Inverno", dataInicio: "2026-07-12", dataFim: "2026-07-14", local: "Praça Central" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ gratuito: true, dataInicio: "2026-07-12T00:00:00.000Z", dataFim: "2026-07-14T00:00:00.000Z" });
  });

  it("recusa data final antes da inicial", async () => {
    const { auth } = await criarUsuario();
    const res = await request(app)
      .post("/api/eventos")
      .set(auth)
      .send({ nome: "Evento errado", dataInicio: "2026-07-14", dataFim: "2026-07-12", local: "Praça" });
    expect(res.status).toBe(400);
  });

  it("editar não volta o evento pago para gratuito", async () => {
    const { auth } = await criarUsuario();
    const evento = await prisma.evento.create({
      data: { nome: "Show", local: "Ginásio", dataInicio: new Date("2026-08-01"), gratuito: false },
    });

    const res = await request(app).put(`/api/eventos/${evento.id}`).set(auth).send({ local: "Estádio" });
    expect(res.body).toMatchObject({ local: "Estádio", gratuito: false });
  });

  it("editar a data inicial confere com a data final já salva", async () => {
    const { auth } = await criarUsuario();
    const evento = await criarEvento("Feira", "2026-08-20", "2026-08-22");

    const res = await request(app).put(`/api/eventos/${evento.id}`).set(auth).send({ dataInicio: "2026-08-25" });
    expect(res.status).toBe(400);
  });

  it("dataFim null transforma em evento de um dia", async () => {
    const { auth } = await criarUsuario();
    const evento = await criarEvento("Feira", "2026-08-20", "2026-08-22");

    const res = await request(app).put(`/api/eventos/${evento.id}`).set(auth).send({ dataFim: null });
    expect(res.body.dataFim).toBeNull();
  });
});

describe("GET/DELETE /api/eventos/:id", () => {
  it("busca um evento e dá 404 para id inexistente", async () => {
    const evento = await criarEvento("Festa do Padroeiro", diaRelativo(10));

    const res = await request(app).get(`/api/eventos/${evento.id}`);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Festa do Padroeiro");
    expect((await request(app).get("/api/eventos/999999")).status).toBe(404);
  });

  it("só ADMIN apaga", async () => {
    const editor = await criarUsuario("EDITOR");
    const admin = await criarUsuario("ADMIN");
    const evento = await criarEvento("Show", diaRelativo(5));

    expect((await request(app).delete(`/api/eventos/${evento.id}`)).status).toBe(401);
    expect((await request(app).delete(`/api/eventos/${evento.id}`).set(editor.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/eventos/${evento.id}`).set(admin.auth)).status).toBe(204);
    expect((await request(app).get(`/api/eventos/${evento.id}`)).status).toBe(404);
  });
});

describe("inventário turístico (/api/atrativos)", () => {
  const atrativo = (nome: string, tipo: "ATRATIVO" | "EQUIPAMENTO" | "SERVICO", revisadoEm = new Date()) =>
    prisma.atrativo.create({ data: { nome, tipo, categoria: "Teste", revisadoEm } });

  const mesesAtras = (meses: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    return d;
  };

  it("lista as categorias sem repetir, com filtro por tipo", async () => {
    await prisma.atrativo.createMany({
      data: [
        { nome: "Igreja Matriz", tipo: "ATRATIVO", categoria: "Igreja" },
        { nome: "Capela", tipo: "ATRATIVO", categoria: "Igreja" },
        { nome: "Rampa do Zeza", tipo: "ATRATIVO", categoria: "Pico" },
        { nome: "Hotel Central", tipo: "EQUIPAMENTO", categoria: "Hotel" },
      ],
    });

    expect((await request(app).get("/api/atrativos/categorias")).body).toEqual(["Hotel", "Igreja", "Pico"]);
    expect((await request(app).get("/api/atrativos/categorias?tipo=EQUIPAMENTO")).body).toEqual(["Hotel"]);
    expect((await request(app).get("/api/atrativos/categorias?tipo=PRAIA")).status).toBe(400);
  });

  it("filtra por tipo e recusa tipo inválido", async () => {
    const igreja = await atrativo("Igreja Matriz", "ATRATIVO");
    await atrativo("Hotel Central", "EQUIPAMENTO");

    const res = await request(app).get("/api/atrativos?tipo=ATRATIVO");
    expect(res.body.map((a: { id: number }) => a.id)).toEqual([igreja.id]);
    expect((await request(app).get("/api/atrativos?tipo=PRAIA")).status).toBe(400);
  });

  it("revisao-pendente lista os itens sem conferência há mais de 12 meses", async () => {
    const { auth } = await criarUsuario("EDITOR");
    const antigo = await atrativo("Cachoeira", "ATRATIVO", mesesAtras(13));
    await atrativo("Pico", "ATRATIVO", mesesAtras(11));

    expect((await request(app).get("/api/atrativos/revisao-pendente")).status).toBe(401);
    const res = await request(app).get("/api/atrativos/revisao-pendente").set(auth);
    expect(res.body).toMatchObject({ meses: 12, total: 1 });
    expect(res.body.atrativos[0].id).toBe(antigo.id);
  });

  it("revisar ou editar tira o item da lista de pendentes", async () => {
    const { auth } = await criarUsuario("EDITOR");
    const a = await atrativo("Cachoeira", "ATRATIVO", mesesAtras(13));
    const b = await atrativo("Mirante", "ATRATIVO", mesesAtras(13));

    expect((await request(app).post(`/api/atrativos/${a.id}/revisar`).set(auth)).status).toBe(200);
    expect((await request(app).put(`/api/atrativos/${b.id}`).set(auth).send({ contato: "@mirante" })).status).toBe(200);

    const res = await request(app).get("/api/atrativos/revisao-pendente").set(auth);
    expect(res.body.total).toBe(0);
  });

  it("só ADMIN apaga", async () => {
    const editor = await criarUsuario("EDITOR");
    const admin = await criarUsuario("ADMIN");
    const a = await atrativo("Cachoeira", "ATRATIVO");

    expect((await request(app).delete(`/api/atrativos/${a.id}`).set(editor.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/atrativos/${a.id}`).set(admin.auth)).status).toBe(204);
  });

  it("busca por parte do nome, sem diferenciar maiúsculas nem acentos", async () => {
    const cruzeiro = await atrativo("Santo Cruzeiro", "ATRATIVO");
    const campao = await atrativo("Campão de Eventos", "ATRATIVO");
    await atrativo("Igreja Matriz", "ATRATIVO");

    const ids = async (busca: string) =>
      (await request(app).get(`/api/atrativos?busca=${encodeURIComponent(busca)}`)).body.map((a: { id: number }) => a.id);
    expect(await ids("cruzeiro")).toEqual([cruzeiro.id]);
    expect(await ids("CRUZ")).toEqual([cruzeiro.id]);
    expect(await ids("campao")).toEqual([campao.id]);
    expect(await ids("praia")).toEqual([]);
    expect((await request(app).get("/api/atrativos?busca=a")).status).toBe(400);
  });

  it("guarda as informações para o visitante e deixa só o usuário do Instagram", async () => {
    const admin = await criarUsuario("ADMIN");
    const criado = await request(app).post("/api/atrativos").set(admin.auth).send({
      nome: "Inatel", tipo: "ATRATIVO", categoria: "Tecnologia e educação",
      horarioFuncionamento: "Seg a sex, 8h às 22h", melhorHorario: "Manhã",
      periodoMovimentado: "Semestre letivo", instagram: "https://www.instagram.com/inatel/",
    });
    expect(criado.status).toBe(201);
    expect(criado.body.instagram).toBe("inatel");

    const lido = await request(app).get(`/api/atrativos/${criado.body.id}`);
    expect(lido.body).toMatchObject({ horarioFuncionamento: "Seg a sex, 8h às 22h", melhorHorario: "Manhã", periodoMovimentado: "Semestre letivo" });

    const editar = (instagram: string) => request(app).put(`/api/atrativos/${criado.body.id}`).set(admin.auth).send({ instagram });
    expect((await editar("@inatel.oficial")).body.instagram).toBe("inatel.oficial");
    expect((await editar("")).body.instagram).toBeNull();
    expect((await editar("perfil inválido!")).status).toBe(400);
  });
});

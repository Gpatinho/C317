import { describe, expect, it } from "vitest";
import type { Atrativo } from "../lib/api";
import { limpar, paraCampos, perfilInstagram, validar, type CamposAtrativo } from "../app/admin/inventario/validacao";

// Inventário turístico (/admin/inventario): os lugares da busca do dashboard e da página do lugar

const campos = (dados: Partial<CamposAtrativo> = {}): CamposAtrativo => ({
  nome: "Mirante do Santo Cruzeiro",
  tipo: "ATRATIVO",
  categoria: "Mirante",
  descricao: "",
  endereco: "",
  contato: "",
  horarioFuncionamento: "",
  melhorHorario: "",
  periodoMovimentado: "",
  instagram: "",
  ...dados,
});

describe("perfilInstagram", () => {
  it("aceita o perfil com ou sem @", () => {
    expect(perfilInstagram("@inatel.tecnologias")).toBe("inatel.tecnologias");
    expect(perfilInstagram("blocourso")).toBe("blocourso");
  });

  it("tira o perfil de um link colado", () => {
    expect(perfilInstagram("https://www.instagram.com/santuario_santarita_srs/")).toBe("santuario_santarita_srs");
    expect(perfilInstagram("instagram.com/prefeiturasrs/reels/")).toBe("prefeiturasrs");
  });

  it("ignora espaços nas pontas e devolve vazio quando não tem nada", () => {
    expect(perfilInstagram("  @inatel  ")).toBe("inatel");
    expect(perfilInstagram("")).toBe("");
  });
});

describe("validar (inventário)", () => {
  it("aceita um lugar só com nome e categoria", () => {
    expect(validar(campos())).toEqual({});
  });

  it("exige nome e categoria", () => {
    expect(validar(campos({ nome: " ", categoria: "M" }))).toEqual({
      nome: "Informe o nome do lugar.",
      categoria: "Informe a categoria (ex.: Mirante).",
    });
  });

  it("aceita o Instagram como @perfil ou como link", () => {
    expect(validar(campos({ instagram: "@blocourso" }))).toEqual({});
    expect(validar(campos({ instagram: "https://instagram.com/inatel.tecnologias/" }))).toEqual({});
  });

  it("recusa Instagram com espaços ou símbolos", () => {
    expect(validar(campos({ instagram: "bloco do urso" })).instagram).toBe("Use só o nome do perfil, ex.: @inatel");
    expect(validar(campos({ instagram: "@bloco-urso!" })).instagram).toBeDefined();
  });

  it("recusa perfil com mais de 30 caracteres, o limite do Instagram", () => {
    expect(validar(campos({ instagram: "a".repeat(31) })).instagram).toBeDefined();
    expect(validar(campos({ instagram: "a".repeat(30) }))).toEqual({});
  });
});

describe("limpar", () => {
  it("tira os espaços e transforma campos opcionais vazios em null", () => {
    const dados = limpar(campos({ nome: "  Inatel  ", endereco: "  ", horarioFuncionamento: " Seg a sex, 8h às 22h " }));
    expect(dados).toMatchObject({
      nome: "Inatel",
      endereco: null,
      descricao: null,
      horarioFuncionamento: "Seg a sex, 8h às 22h",
    });
  });

  it("manda o Instagram vazio como \"\" (a API apaga o perfil salvo)", () => {
    expect(limpar(campos({ instagram: "   " })).instagram).toBe("");
  });
});

describe("paraCampos", () => {
  it("prepara um lugar salvo para o formulário de edição", () => {
    const salvo = {
      id: 1,
      nome: "Bloco do Urso (Cidade do Urso)",
      tipo: "ATRATIVO",
      categoria: "Carnaval",
      descricao: null,
      endereco: "Av. Embaixador Bilac Pinto, s/n",
      contato: null,
      horarioFuncionamento: null,
      melhorHorario: null,
      periodoMovimentado: "Carnaval",
      instagram: "blocourso",
      revisadoEm: "2026-11-12T00:00:00.000Z",
    } as Atrativo;
    expect(paraCampos(salvo)).toMatchObject({ descricao: "", contato: "", instagram: "@blocourso" });
  });

  it("lugar sem Instagram fica com o campo vazio, sem @ sozinho", () => {
    const salvo = { ...campos(), id: 2, instagram: null, revisadoEm: "" } as unknown as Atrativo;
    expect(paraCampos(salvo).instagram).toBe("");
  });
});

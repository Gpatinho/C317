import type { Atrativo, DadosAtrativo, TipoAtrativo } from "@/lib/api";

// Regras do inventário turístico, separadas da tela para poderem ser testadas.

export type CamposAtrativo = Record<Exclude<keyof DadosAtrativo, "tipo">, string> & { tipo: TipoAtrativo };
export type ErrosAtrativo = Partial<Record<keyof CamposAtrativo, string>>;

// Do que a pessoa digitou ("@inatel", "inatel" ou o link do perfil), fica só o nome do perfil
export function perfilInstagram(texto: string) {
  return texto
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

// Mesmas regras do back-end (atrativoSchema)
export function validar(c: CamposAtrativo) {
  const erros: ErrosAtrativo = {};
  if (c.nome.trim().length < 2) erros.nome = "Informe o nome do lugar.";
  if (c.categoria.trim().length < 2) erros.categoria = "Informe a categoria (ex.: Mirante).";
  const insta = perfilInstagram(c.instagram);
  if (insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta)) erros.instagram = "Use só o nome do perfil, ex.: @inatel";
  return erros;
}

// Campos opcionais vazios viram null para apagar o valor no banco
export const limpar = (c: CamposAtrativo): DadosAtrativo => {
  const opcional = (v: string) => v.trim() || null;
  return {
    nome: c.nome.trim(),
    tipo: c.tipo,
    categoria: c.categoria.trim(),
    descricao: opcional(c.descricao),
    endereco: opcional(c.endereco),
    contato: opcional(c.contato),
    horarioFuncionamento: opcional(c.horarioFuncionamento),
    melhorHorario: opcional(c.melhorHorario),
    periodoMovimentado: opcional(c.periodoMovimentado),
    instagram: c.instagram.trim(), // a API aceita "@perfil", "perfil" ou o link, e "" apaga
  };
};

// Item salvo -> campos do formulário de edição (null vira "" e o Instagram ganha o @)
export const paraCampos = (a: Atrativo): CamposAtrativo => ({
  nome: a.nome,
  tipo: a.tipo,
  categoria: a.categoria,
  descricao: a.descricao ?? "",
  endereco: a.endereco ?? "",
  contato: a.contato ?? "",
  horarioFuncionamento: a.horarioFuncionamento ?? "",
  melhorHorario: a.melhorHorario ?? "",
  periodoMovimentado: a.periodoMovimentado ?? "",
  instagram: a.instagram ? `@${a.instagram}` : "",
});

import { createHash, randomBytes } from "node:crypto";

// Código que o estabelecimento usa no formulário de coleta (ex.: "7KQ2-M9PX").
// Só o hash vai para o banco, como uma senha: o código aparece uma única vez,
// na resposta da rota que o gera.

// 32 caracteres, sem 0/O e 1/I, que se confundem quando alguém digita o código
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarCodigo(): string {
  const bytes = randomBytes(8);
  let codigo = "";
  for (const b of bytes) codigo += ALFABETO[b % ALFABETO.length];
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

// Ignora maiúsculas/minúsculas, espaços e o traço: "7kq2 m9px" vale o mesmo que "7KQ2-M9PX"
export function hashCodigo(codigo: string): string {
  const normalizado = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(normalizado).digest("hex");
}
"use client";

import { createContext, useContext } from "react";
import type { Usuario } from "@/lib/api";

// O layout do /admin confere o login uma vez e compartilha o usuário com todas
// as telas do painel por este contexto. Assim cada tela não precisa repetir a verificação.
type Sessao = {
  usuario: Usuario;
  // Chame quando a API responder 401: apaga o token e manda para o login com o aviso.
  sessaoExpirou: () => void;
};

export const SessaoContext = createContext<Sessao | null>(null);

export function useSessao() {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error("useSessao precisa estar dentro de app/admin/layout.tsx");
  return sessao;
}

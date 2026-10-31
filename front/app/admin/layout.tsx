"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, type Usuario } from "@/lib/api";
import { SessaoContext } from "./_componentes/sessao";
import {
  IconeBarras,
  IconeCaixa,
  IconeCasa,
  IconeDocumento,
  IconeExterno,
  IconeFechar,
  IconeMapa,
  IconeMenu,
  IconeSair,
  IconeUpload,
} from "./_componentes/icones";

// Itens do menu. O título aparece na barra do celular quando a tela está aberta.
// soAdmin: o item some para o EDITOR (a API também bloqueia essas rotas).
const MENU: { href: string; titulo: string; mobile: string; icone: ReactNode; soAdmin?: boolean }[] = [
  { href: "/admin", titulo: "Visão geral", mobile: "Painel administrativo", icone: <IconeCasa /> },
  { href: "/admin/lancar", titulo: "Lançar valores", mobile: "Lançar valores", icone: <IconeBarras /> },
  { href: "/admin/publicar", titulo: "Publicar relatório", mobile: "Publicar relatório", icone: <IconeUpload /> },
  { href: "/admin/envios", titulo: "Envios", mobile: "Envios", icone: <IconeCaixa /> },
  { href: "/admin/estabelecimentos", titulo: "Estabelecimentos", mobile: "Estabelecimentos", icone: <IconeDocumento /> },
  { href: "/admin/inventario", titulo: "Inventário turístico", mobile: "Inventário turístico", icone: <IconeMapa /> },
];

const menuDo = (usuario: Usuario) => MENU.filter((m) => !m.soAdmin || usuario.papel === "ADMIN");

// Layout de todas as telas do /admin: confere o login, mostra o menu lateral
// (ou a barra + gaveta no celular) e entrega o usuário para as telas via useSessao().
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const caminho = usePathname();
  const [usuario, setUsuario] = useState<Usuario>();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!api.temSessao()) {
      router.replace("/login");
      return;
    }
    let cancelado = false;
    api
      .me()
      .then((u) => !cancelado && setUsuario(u))
      .catch((err) => {
        if (cancelado) return;
        // 401 = token vencido ou inválido: apaga e pede login de novo.
        // Outros erros (ex.: API fora do ar) só mandam para o login, sem apagar o token.
        if (err instanceof ApiError && err.status === 401) {
          api.logout();
          router.replace("/login?expirou=1");
        } else {
          router.replace("/login");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [router]);

  const sessaoExpirou = useCallback(() => {
    api.logout();
    router.replace("/login?expirou=1");
  }, [router]);

  const sessao = useMemo(() => (usuario ? { usuario, sessaoExpirou } : null), [usuario, sessaoExpirou]);

  function sair() {
    api.logout();
    router.replace("/login");
  }

  if (!sessao) return <VerificandoAcesso />;

  const atual = menuDo(sessao.usuario).find((m) => m.href === caminho) ?? MENU[0];

  return (
    <SessaoContext.Provider value={sessao}>
      <div className="min-h-screen bg-gray-50 lg:flex">
        {/* Menu lateral fixo (computador) */}
        <aside className="hidden lg:flex w-[264px] shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">
          <MenuLateral usuario={sessao.usuario} caminho={caminho} onSair={sair} />
        </aside>

        {/* Menu em gaveta (celular) */}
        {menuAberto && (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              aria-label="Fechar menu"
              onClick={() => setMenuAberto(false)}
              className="absolute inset-0 bg-gray-900/50"
            />
            <aside className="relative w-4/5 max-w-xs h-full bg-white shadow-xl flex">
              <MenuLateral
                usuario={sessao.usuario}
                caminho={caminho}
                onSair={sair}
                onFechar={() => setMenuAberto(false)}
              />
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Barra superior (celular) */}
          <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <IconeMenu />
            </button>
            <span className="text-sm font-semibold text-gray-800">{atual.mobile}</span>
            <Avatar nome={sessao.usuario.nome} pequeno />
          </header>

          {children}
        </div>
      </div>
    </SessaoContext.Provider>
  );
}

function MenuLateral({
  usuario,
  caminho,
  onSair,
  onFechar,
}: {
  usuario: Usuario;
  caminho: string;
  onSair: () => void;
  onFechar?: () => void;
}) {
  const item = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm";
  return (
    <div className="flex flex-col w-full p-5">
      <div className="flex items-start justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-fuchsia-600 flex items-center justify-center text-lg text-white">
            🏛
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">Observatório do Turismo</p>
            <p className="text-xs text-gray-500">Painel administrativo</p>
          </div>
        </Link>
        {onFechar && (
          <button onClick={onFechar} aria-label="Fechar menu" className="text-gray-400 hover:text-gray-600 p-1">
            <IconeFechar />
          </button>
        )}
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {menuDo(usuario).map((m) => {
          const ativo = m.href === caminho;
          return (
            <Link
              key={m.href}
              href={m.href}
              onClick={onFechar}
              aria-current={ativo ? "page" : undefined}
              className={`${item} ${ativo ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {m.icone} {m.titulo}
            </Link>
          );
        })}
        <hr className="my-3 border-gray-200" />
        <Link href="/" target="_blank" rel="noopener noreferrer" className={`${item} text-gray-600 hover:bg-gray-50`}>
          <IconeExterno /> Ver site público ↗
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar nome={usuario.nome} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{usuario.nome}</p>
            <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
            <span
              className={`inline-block mt-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                usuario.papel === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {usuario.papel === "ADMIN" ? "Administrador" : "Editor"}
            </span>
          </div>
        </div>
        <button
          onClick={onSair}
          className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-700"
        >
          <IconeSair /> Sair
        </button>
      </div>
    </div>
  );
}

function Avatar({ nome, pequeno }: { nome: string; pequeno?: boolean }) {
  return (
    <div
      className={`${pequeno ? "w-8 h-8 text-sm" : "w-10 h-10"} shrink-0 rounded-full bg-violet-600 text-white font-semibold flex items-center justify-center`}
      aria-hidden
    >
      {nome.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function VerificandoAcesso() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-fuchsia-600 flex items-center justify-center text-2xl text-white">
        🏛
      </div>
      <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
      <p className="text-sm text-gray-500">Verificando seu acesso…</p>
    </main>
  );
}

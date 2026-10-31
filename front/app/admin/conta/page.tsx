"use client";

import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { IconeAlerta, IconeCheck } from "../_componentes/icones";
import { useSessao } from "../_componentes/sessao";

// Dados de quem está logado e troca da própria senha (PUT /api/auth/senha).
// Esqueceu a senha? Um administrador redefine em /admin/usuarios.

type Campos = { senhaAtual: string; novaSenha: string; confirmar: string };
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = { senhaAtual: "", novaSenha: "", confirmar: "" };

// Mesmas regras do back-end (trocarSenhaSchema), mais a confirmação
function validar(c: Campos) {
  const erros: Erros = {};
  if (!c.senhaAtual) erros.senhaAtual = "Informe a senha atual.";
  if (c.novaSenha.length < 6) erros.novaSenha = "A nova senha precisa ter pelo menos 6 caracteres.";
  else if (c.novaSenha === c.senhaAtual) erros.novaSenha = "A nova senha precisa ser diferente da atual.";
  if (!erros.novaSenha && c.confirmar !== c.novaSenha) erros.confirmar = "As senhas não são iguais.";
  return erros;
}

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

export default function MinhaConta() {
  const { usuario, sessaoExpirou } = useSessao();
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocou, setTrocou] = useState(false);

  function mudar(campo: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setTrocou(false);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const v = validar(campos);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    try {
      await api.trocarSenha(campos.senhaAtual, campos.novaSenha);
      setCampos(VAZIO);
      setTrocou(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      if (err instanceof ApiError && err.status === 400 && /senha atual/i.test(err.message)) {
        setErros({ senhaAtual: err.message });
      } else if (err instanceof ApiError && err.status === 429) {
        setErro("Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.");
      } else {
        setErro(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
      }
    } finally {
      setSalvando(false);
    }
  }

  const campo = (nome: keyof Campos, rotulo: string, autoComplete: string) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type="password"
        value={campos[nome]}
        disabled={salvando}
        autoComplete={autoComplete}
        aria-invalid={Boolean(erros[nome])}
        onChange={(e) => mudar(nome, e.target.value)}
        className={classeCampo(erros[nome])}
      />
      {erros[nome] && <span className="block mt-1 text-xs text-red-600">{erros[nome]}</span>}
    </label>
  );

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-3xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Minha conta</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">Seus dados de acesso ao painel.</p>

      <section className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 flex items-center gap-4">
        <div className="w-12 h-12 shrink-0 rounded-full bg-violet-600 text-white text-lg font-semibold flex items-center justify-center" aria-hidden>
          {usuario.nome.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800">{usuario.nome}</p>
          <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
          <span
            className={`inline-block mt-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
              usuario.papel === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {usuario.papel === "ADMIN" ? "Administrador" : "Editor"}
          </span>
        </div>
      </section>

      <form onSubmit={salvar} noValidate className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="font-serif text-xl font-bold text-gray-800">Trocar senha</h2>
        <div className="mt-5 space-y-4">
          {campo("senhaAtual", "SENHA ATUAL", "current-password")}
          <div className="grid gap-4 sm:grid-cols-2">
            {campo("novaSenha", "NOVA SENHA", "new-password")}
            {campo("confirmar", "CONFIRME A NOVA SENHA", "new-password")}
          </div>
        </div>
        {erro && (
          <p role="alert" className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <IconeAlerta /> {erro}
          </p>
        )}
        {trocou && (
          <p role="status" className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
            <IconeCheck /> Senha trocada. Use a nova senha no próximo login.
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : "Trocar senha"}
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs text-gray-500">Esqueceu a senha? Um administrador pode redefini-la em Usuários.</p>
    </main>
  );
}

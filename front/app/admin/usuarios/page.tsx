"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type DadosUsuario, type Papel, type UsuarioEquipe } from "@/lib/api";
import { formatarData } from "../_componentes/formato";
import { IconeAlerta, IconeLapis, IconeLixeira, IconeUsuarios } from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

// Gestão da equipe da SMCELT que acessa o painel. Só o ADMIN entra aqui (a API também confere).

const PAPEIS: { valor: Papel; rotulo: string; ajuda: string }[] = [
  { valor: "EDITOR", rotulo: "Editor", ajuda: "Lança valores, publica relatórios e analisa envios. Não exclui nada." },
  { valor: "ADMIN", rotulo: "Administrador", ajuda: "Pode tudo, inclusive excluir e gerenciar usuários." },
];

type Campos = { nome: string; email: string; papel: Papel; senha: string };
type Erros = Partial<Record<keyof Campos, string>>;

// Mesmas regras do back-end (usuarioSchema). Na edição a senha é opcional.
function validar(c: Campos, novo: boolean) {
  const erros: Erros = {};
  if (c.nome.trim().length < 2) erros.nome = "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) erros.email = "Informe um e-mail válido.";
  if ((novo || c.senha) && c.senha.length < 6) erros.senha = "A senha precisa ter pelo menos 6 caracteres.";
  return erros;
}

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

type Dados = { tentativa: number; lista?: UsuarioEquipe[]; erro?: boolean };

export default function Usuarios() {
  const { usuario } = useSessao();
  if (usuario.papel !== "ADMIN") return <AcessoRestrito />;
  return <GestaoUsuarios />;
}

function GestaoUsuarios() {
  const { usuario: eu, sessaoExpirou } = useSessao();
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioEquipe>();
  const [excluindo, setExcluindo] = useState<UsuarioEquipe>();

  useEffect(() => {
    let cancelado = false;
    api
      .usuarios()
      .then((lista) => !cancelado && setDados({ tentativa, lista }))
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa, sessaoExpirou]);

  function salvo(u: UsuarioEquipe) {
    setDados((d) => {
      if (!d) return d;
      const existe = d.lista?.some((x) => x.id === u.id);
      const lista = existe ? d.lista!.map((x) => (x.id === u.id ? u : x)) : [...(d.lista ?? []), u];
      return { ...d, lista: lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) };
    });
    setNovoAberto(false);
    setEditando(undefined);
  }

  const lista = dados?.lista ?? [];

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Usuários</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500">Pessoas da equipe da SMCELT com acesso ao painel.</p>
        </div>
        <button
          onClick={() => setNovoAberto(true)}
          className="self-start sm:self-auto bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5"
        >
          + Novo usuário
        </button>
      </div>

      <section aria-busy={carregando} className={`mt-8 transition-opacity ${carregando ? "opacity-50" : ""}`}>
        {dados?.erro && !carregando && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700">Não foi possível carregar os usuários.</p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="mt-3 border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2"
            >
              Tentar de novo
            </button>
          </div>
        )}

        <ul className="space-y-3">
          {lista.map((u) => {
            const souEu = u.id === eu.id;
            return (
              <li key={u.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-violet-600 text-white font-semibold flex items-center justify-center" aria-hidden>
                  {u.nome.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">
                    {u.nome} {souEu && <span className="text-xs font-normal text-gray-500">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        u.papel === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.papel === "ADMIN" ? "Administrador" : "Editor"}
                    </span>
                    <span className="text-[11px] text-gray-400">desde {formatarData(u.criadoEm)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditando(u)}
                    aria-label={`Editar ${u.nome}`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <IconeLapis />
                  </button>
                  {!souEu && (
                    <button
                      onClick={() => setExcluindo(u)}
                      aria-label={`Excluir ${u.nome}`}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <IconeLixeira />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {(novoAberto || editando) && (
        <ModalFormulario
          usuario={editando}
          souEu={editando?.id === eu.id}
          onFechar={() => {
            setNovoAberto(false);
            setEditando(undefined);
          }}
          onSalvo={salvo}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          usuario={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onExcluido={(id) => {
            setDados((d) => d && { ...d, lista: d.lista?.filter((x) => x.id !== id) });
            setExcluindo(undefined);
          }}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

function ModalFormulario({
  usuario,
  souEu,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  usuario?: UsuarioEquipe; // sem usuario = novo
  souEu: boolean; // a API não deixa mudar o próprio papel
  onFechar: () => void;
  onSalvo: (u: UsuarioEquipe) => void;
  onSessaoExpirada: () => void;
}) {
  const novo = !usuario;
  const [campos, setCampos] = useState<Campos>({
    nome: usuario?.nome ?? "",
    email: usuario?.email ?? "",
    papel: usuario?.papel ?? "EDITOR",
    senha: "",
  });
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mudar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validar(campos, novo);
    setErros(v);
    if (Object.keys(v).length) return;
    setSalvando(true);
    setErro("");
    const dados: DadosUsuario = { nome: campos.nome.trim(), email: campos.email.trim(), papel: campos.papel };
    if (campos.senha) dados.senha = campos.senha;
    try {
      onSalvo(usuario ? await api.editarUsuario(usuario.id, dados) : await api.criarUsuario(dados));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      if (err instanceof ApiError && err.status === 409) {
        setErros({ email: "Já existe um usuário com este e-mail." });
      } else {
        setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
      setSalvando(false);
    }
  }

  const campo = (nome: "nome" | "email" | "senha", rotulo: string, tipo: string, placeholder: string, ajuda?: string) => (
    <label className="block">
      <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">{rotulo}</span>
      <input
        type={tipo}
        value={campos[nome]}
        disabled={salvando}
        placeholder={placeholder}
        autoComplete={nome === "senha" ? "new-password" : "off"}
        aria-invalid={Boolean(erros[nome])}
        onChange={(e) => mudar(nome, e.target.value)}
        className={classeCampo(erros[nome])}
      />
      {erros[nome] ? (
        <span className="block mt-1 text-xs text-red-600">{erros[nome]}</span>
      ) : (
        ajuda && <span className="block mt-1 text-xs text-gray-500">{ajuda}</span>
      )}
    </label>
  );

  return (
    <Modal onFechar={onFechar} largura="max-w-[520px]">
      <form onSubmit={salvar} noValidate>
        <h2 className="font-serif text-2xl font-bold text-gray-800">{novo ? "Novo usuário" : "Editar usuário"}</h2>
        <div className="mt-5 space-y-4">
          {campo("nome", "NOME", "text", "Ex.: Ana Souza")}
          {campo("email", "E-MAIL", "email", "nome@santaritadosapucai.mg.gov.br")}
          {campo(
            "senha",
            novo ? "SENHA INICIAL" : "NOVA SENHA (OPCIONAL)",
            "password",
            "Mínimo de 6 caracteres",
            novo ? "Repasse à pessoa; ela pode trocar depois." : "Preencha só para redefinir a senha desta pessoa.",
          )}
          <fieldset>
            <legend className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">PAPEL</legend>
            <div className="grid gap-2">
              {PAPEIS.map((p) => (
                <label
                  key={p.valor}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${souEu ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${
                    campos.papel === p.valor ? "border-violet-500 bg-violet-50" : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="papel"
                    value={p.valor}
                    checked={campos.papel === p.valor}
                    onChange={() => mudar("papel", p.valor)}
                    disabled={salvando || souEu}
                    className="sr-only"
                  />
                  <span className="font-semibold text-gray-800">{p.rotulo}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{p.ajuda}</span>
                </label>
              ))}
            </div>
            {souEu && <p className="mt-1 text-xs text-gray-500">Você não pode alterar o seu próprio papel.</p>}
          </fieldset>
        </div>

        {erro && <Aviso>{erro}</Aviso>}
        <div className="mt-6 flex justify-end gap-3">
          <BotaoCancelar onClick={onFechar} />
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : novo ? "Criar usuário" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir({
  usuario,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  usuario: UsuarioEquipe;
  onFechar: () => void;
  onExcluido: (id: number) => void;
  onSessaoExpirada: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    setExcluindo(true);
    setErro("");
    try {
      await api.excluirUsuario(usuario.id);
      onExcluido(usuario.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErro(err instanceof Error ? err.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[420px]">
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
        <IconeLixeira tamanho={22} />
      </div>
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Remover este usuário?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {usuario.nome} perde o acesso ao painel. Quem já lançou valores ou publicou relatórios não pode ser removido.
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="mt-6 flex justify-end gap-3">
        <BotaoCancelar onClick={onFechar} />
        <button
          onClick={excluir}
          disabled={excluindo}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
        >
          {excluindo ? "Removendo..." : "Remover"}
        </button>
      </div>
    </Modal>
  );
}

function AcessoRestrito() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <div className="bg-white border border-gray-200 rounded-2xl px-6 py-14 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
          <IconeUsuarios />
        </div>
        <h1 className="mt-4 font-semibold text-gray-800">Acesso restrito</h1>
        <p className="mt-1 text-sm text-gray-500">Só administradores podem gerenciar os usuários do painel.</p>
      </div>
    </main>
  );
}

function BotaoCancelar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
    >
      Cancelar
    </button>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <IconeAlerta /> {children}
    </p>
  );
}

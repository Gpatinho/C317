"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { ApiError, api, type Relatorio } from "@/lib/api";
import { formatarData } from "../_componentes/formato";
import {
  IconeAlerta,
  IconeCarregando,
  IconeFechar,
  IconeImagem,
  IconeLapis,
  IconeLixeira,
  IconeOlho,
  IconeTresPontos,
  IconeUpload,
} from "../_componentes/icones";
import { Modal } from "../_componentes/modal";
import { useSessao } from "../_componentes/sessao";

// Mesmos limites do back-end (backend/src/routes/relatorios.routes.ts e schemas/index.ts)
const LIMITE_MB = 20;
const TITULO_MAX = 200;

// 2516582 -> "2,4 MB"
function formatarTamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

// Ano que aparece na etiqueta: o informado ou, se vazio, o da publicação
const anoDo = (r: Relatorio) => r.ano ?? new Date(r.publicadoEm).getFullYear();

// Confere o arquivo escolhido antes de enviar. Lê os 5 primeiros bytes:
// todo PDF de verdade começa com "%PDF-" (o back-end confere a mesma coisa).
async function conferirArquivo(arquivo: File): Promise<{ erro?: string; tipo?: "formato" | "tamanho" | "invalido" }> {
  const ehPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
  if (!ehPdf) return { erro: "Apenas arquivos PDF são aceitos.", tipo: "formato" };
  if (arquivo.size > LIMITE_MB * 1024 * 1024) {
    return { erro: `O arquivo passa de ${LIMITE_MB} MB. Diminua o tamanho e tente de novo.`, tipo: "tamanho" };
  }
  const inicio = await arquivo.slice(0, 5).text();
  if (inicio !== "%PDF-") return { erro: "O arquivo enviado não é um PDF válido.", tipo: "invalido" };
  return {};
}

// Confere título e ano (os dois formulários usam)
function validarCampos(titulo: string, ano: string) {
  const erros: { titulo?: string; ano?: string } = {};
  if (titulo.trim().length < 3) erros.titulo = "O título precisa ter pelo menos 3 caracteres.";
  if (ano.trim()) {
    const n = Number(ano);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) erros.ano = "Use um ano entre 2000 e 2100.";
  }
  return erros;
}

type Dados = { tentativa: number; relatorios?: Relatorio[]; erro?: boolean };

export default function PublicarRelatorio() {
  const { usuario, sessaoExpirou } = useSessao();
  const podeExcluir = usuario.papel === "ADMIN";

  // Lista de relatórios publicados ("tentativa" soma 1 no botão "Tentar de novo")
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<Dados>();
  const carregando = dados?.tentativa !== tentativa;

  // Formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [arquivo, setArquivo] = useState<File>();
  const [erroArquivo, setErroArquivo] = useState<{ nome: string; detalhe: string; mensagem: string; tipo?: string }>();
  const [erros, setErros] = useState<{ titulo?: string; ano?: string }>({});
  const [erroApi, setErroApi] = useState("");
  const [progresso, setProgresso] = useState<number>(); // definido = enviando
  const [publicado, setPublicado] = useState<Relatorio>(); // tela de sucesso
  const [novoId, setNovoId] = useState<number>(); // selo "Novo" na lista

  // Modais
  const [editando, setEditando] = useState<Relatorio>();
  const [excluindo, setExcluindo] = useState<Relatorio>();

  const enviando = progresso !== undefined;

  useEffect(() => {
    let cancelado = false;
    api
      .relatorios()
      .then((relatorios) => !cancelado && setDados({ tentativa, relatorios }))
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
        setDados({ tentativa, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa, sessaoExpirou]);

  // Mais recentes primeiro
  const relatorios = useMemo(
    () => [...(dados?.relatorios ?? [])].sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)),
    [dados],
  );

  function atualizarLista(fn: (lista: Relatorio[]) => Relatorio[]) {
    setDados((d) => (d ? { ...d, relatorios: fn(d.relatorios ?? []) } : d));
  }

  async function escolherArquivo(f: File | undefined) {
    setErroApi("");
    if (!f) return;
    const r = await conferirArquivo(f);
    if (r.erro) {
      setArquivo(undefined);
      setErroArquivo({
        nome: f.name,
        detalhe: r.tipo === "tamanho" ? formatarTamanho(f.size) : "",
        mensagem: r.erro,
        tipo: r.tipo,
      });
    } else {
      setErroArquivo(undefined);
      setArquivo(f);
    }
  }

  function limparFormulario() {
    setTitulo("");
    setDescricao("");
    setAno(String(new Date().getFullYear()));
    setArquivo(undefined);
    setErroArquivo(undefined);
    setErros({});
    setErroApi("");
    setPublicado(undefined);
  }

  async function publicar(e: FormEvent) {
    e.preventDefault();
    setErroApi("");
    const v = validarCampos(titulo, ano);
    setErros(v);
    if (Object.keys(v).length > 0 || !arquivo) return;

    const form = new FormData();
    form.append("titulo", titulo.trim());
    if (descricao.trim()) form.append("descricao", descricao.trim());
    if (ano.trim()) form.append("ano", ano.trim());
    form.append("arquivo", arquivo);

    setProgresso(0);
    try {
      const novo = await api.publicarRelatorio(form, setProgresso);
      atualizarLista((lista) => [novo, ...lista]);
      setNovoId(novo.id);
      setPublicado(novo);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return sessaoExpirou();
      setErroApi(err instanceof Error ? err.message : "Não foi possível publicar.");
    } finally {
      setProgresso(undefined);
    }
  }

  function aoEditar(r: Relatorio) {
    atualizarLista((lista) => lista.map((x) => (x.id === r.id ? r : x)));
    setEditando(undefined);
  }

  function aoExcluir(id: number) {
    atualizarLista((lista) => lista.filter((x) => x.id !== id));
    setExcluindo(undefined);
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:p-10 max-w-6xl">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800">Publicar relatório</h1>
      <p className="mt-2 text-sm sm:text-base text-gray-500">Envie um PDF para a página pública de relatórios.</p>

      {/* Novo relatório (ou a mensagem de sucesso depois de publicar) */}
      {publicado ? (
        <section className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-16 sm:py-24 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>
          <h2 className="mt-6 font-serif text-3xl font-bold text-gray-800">Relatório publicado!</h2>
          <p className="mt-3 text-sm text-gray-500">
            {publicado.titulo} já está disponível para download na página pública.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/relatorios"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
            >
              Ver na página pública ↗
            </Link>
            <button
              onClick={limparFormulario}
              className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5"
            >
              Publicar outro
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={publicar} noValidate className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <h2 className="font-serif text-xl font-bold text-gray-800">Novo relatório</h2>

          <div className="mt-5 space-y-5">
            <CamposRelatorio
              titulo={titulo}
              descricao={descricao}
              ano={ano}
              erros={erros}
              desabilitado={enviando}
              onTitulo={(v) => {
                setTitulo(v);
                setErros((e) => ({ ...e, titulo: undefined }));
              }}
              onDescricao={setDescricao}
              onAno={(v) => {
                setAno(v);
                setErros((e) => ({ ...e, ano: undefined }));
              }}
              contador
            />

            <div>
              <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">ARQUIVO PDF</span>
              {arquivo ? (
                <CardArquivo arquivo={arquivo} progresso={progresso} onRemover={() => setArquivo(undefined)} />
              ) : (
                <AreaArquivo onEscolher={escolherArquivo} erro={erroArquivo} desabilitado={enviando} />
              )}
            </div>
          </div>

          {erroApi && (
            <p role="alert" className="mt-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {erroApi}
            </p>
          )}

          <div className="mt-6 flex sm:justify-end">
            <button
              type="submit"
              disabled={!arquivo || enviando}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <IconeCarregando /> Publicando...
                </>
              ) : (
                "Publicar relatório"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Relatórios publicados */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4">Relatórios publicados</h2>
        {carregando ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-5 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 bg-gray-100 rounded" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : dados?.erro ? (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
          >
            <p className="text-sm flex items-center gap-2">
              <IconeAlerta /> Não foi possível carregar os relatórios. Tente novamente em instantes.
            </p>
            <button
              onClick={() => setTentativa((t) => t + 1)}
              className="self-start sm:self-auto bg-white border border-red-300 text-red-700 hover:bg-red-100 text-sm font-semibold rounded-full px-4 py-1.5"
            >
              Tentar de novo
            </button>
          </div>
        ) : relatorios.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-12 text-center">
            <div className="mx-auto w-fit">
              <IconePdf grande />
            </div>
            <p className="mt-4 font-semibold text-gray-800">Nenhum relatório publicado ainda</p>
            <p className="text-sm text-gray-500 mt-1">Use o formulário acima para publicar o primeiro.</p>
          </div>
        ) : (
          <ul className="space-y-3 md:space-y-0 md:bg-white md:border md:border-gray-200 md:rounded-2xl md:shadow-sm md:overflow-hidden">
            {relatorios.map((r) => (
              <ItemRelatorio
                key={r.id}
                relatorio={r}
                novo={r.id === novoId}
                podeExcluir={podeExcluir}
                onEditar={() => setEditando(r)}
                onExcluir={() => setExcluindo(r)}
              />
            ))}
          </ul>
        )}
      </section>

      {editando && (
        <ModalEditar
          relatorio={editando}
          onFechar={() => setEditando(undefined)}
          onSalvo={aoEditar}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
      {excluindo && (
        <ModalExcluir
          relatorio={excluindo}
          onFechar={() => setExcluindo(undefined)}
          onExcluido={aoExcluir}
          onSessaoExpirada={sessaoExpirou}
        />
      )}
    </main>
  );
}

// ---------- Campos (usados no "Novo relatório" e no modal de edição) ----------

const classeCampo = (erro?: string) =>
  `w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
    erro ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-300 text-gray-800 focus:ring-violet-400"
  }`;

function CamposRelatorio({
  titulo,
  descricao,
  ano,
  erros,
  desabilitado,
  onTitulo,
  onDescricao,
  onAno,
  contador,
}: {
  titulo: string;
  descricao: string;
  ano: string;
  erros: { titulo?: string; ano?: string };
  desabilitado?: boolean;
  onTitulo: (v: string) => void;
  onDescricao: (v: string) => void;
  onAno: (v: string) => void;
  contador?: boolean;
}) {
  return (
    <>
      <label className="block">
        <span className="flex justify-between text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
          TÍTULO
          {contador && (
            <span className="font-normal text-gray-400">
              {titulo.length}/{TITULO_MAX}
            </span>
          )}
        </span>
        <input
          type="text"
          value={titulo}
          maxLength={TITULO_MAX}
          onChange={(e) => onTitulo(e.target.value)}
          disabled={desabilitado}
          placeholder="Ex.: Boletim do Turismo — 3º trimestre 2026"
          aria-invalid={Boolean(erros.titulo)}
          className={classeCampo(erros.titulo)}
        />
        {erros.titulo && <span className="block mt-1.5 text-xs text-red-600">{erros.titulo}</span>}
      </label>

      <label className="block">
        <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
          DESCRIÇÃO <span className="normal-case">(opcional)</span>
        </span>
        <textarea
          rows={4}
          value={descricao}
          maxLength={5000}
          onChange={(e) => onDescricao(e.target.value)}
          disabled={desabilitado}
          className={`${classeCampo()} resize-y`}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
          ANO <span className="normal-case">(opcional)</span>
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={ano}
          onChange={(e) => onAno(e.target.value.replace(/\D/g, ""))}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.ano)}
          className={`${classeCampo(erros.ano)} max-w-40`}
        />
        {erros.ano && <span className="block mt-1.5 text-xs text-red-600">{erros.ano}</span>}
      </label>
    </>
  );
}

// ---------- Arquivo ----------

function AreaArquivo({
  onEscolher,
  erro,
  desabilitado,
}: {
  onEscolher: (f: File | undefined) => void;
  erro?: { nome: string; detalhe: string; mensagem: string; tipo?: string };
  desabilitado?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    onEscolher(e.dataTransfer.files[0]);
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          onEscolher(e.target.files?.[0]);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo
        }}
      />

      {erro && (
        <div className="mb-3">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3.5 text-sm">
            {erro.tipo === "formato" ? <IconeImagem /> : <IconeAlerta />}
            <span className="flex-1 truncate">
              {erro.nome}
              {erro.detalhe && ` · ${erro.detalhe}`}
            </span>
            <IconeAlerta />
          </div>
          <p className="mt-1.5 text-xs text-red-600">{erro.mensagem}</p>
        </div>
      )}

      <button
        type="button"
        disabled={desabilitado}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={`w-full rounded-lg border-2 border-dashed px-4 py-9 text-center transition ${
          arrastando ? "border-violet-500 bg-violet-100" : "border-violet-300 bg-violet-50 hover:bg-violet-100"
        }`}
      >
        <span className="mx-auto w-fit block text-violet-700">
          <IconeUpload />
        </span>
        <span className="mt-2 block text-sm font-semibold text-violet-700">
          <span className="hidden sm:inline">Arraste o PDF aqui ou clique para escolher</span>
          <span className="sm:hidden">Toque para escolher o PDF</span>
        </span>
        <span className="mt-1 block text-xs text-gray-500">Apenas PDF, até {LIMITE_MB} MB</span>
      </button>
    </>
  );
}

function CardArquivo({ arquivo, progresso, onRemover }: { arquivo: File; progresso?: number; onRemover: () => void }) {
  const enviando = progresso !== undefined;
  return (
    <div className="rounded-lg border border-violet-200 bg-gray-50/50 px-4 sm:px-5 py-6">
      <div className="flex items-center gap-4">
        <IconePdf />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 truncate">{arquivo.name}</p>
          <p className="text-xs text-gray-500">{formatarTamanho(arquivo.size)}</p>
        </div>
        {!enviando && (
          <button type="button" onClick={onRemover} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <IconeFechar tamanho={16} /> Remover
          </button>
        )}
      </div>
      {enviando && (
        <div className="mt-5">
          <div className="h-1.5 rounded-full bg-violet-100 overflow-hidden">
            <div className="h-full bg-violet-600 transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-violet-700">
            {progresso < 100 ? `Enviando... ${progresso}%` : "Processando..."}
          </p>
        </div>
      )}
    </div>
  );
}

function IconePdf({ grande }: { grande?: boolean }) {
  return (
    <div
      className={`${grande ? "w-14 h-14" : "w-10 h-10"} shrink-0 rounded-lg bg-red-50 text-red-600 flex flex-col items-center justify-center`}
      aria-hidden
    >
      <svg width={grande ? 24 : 18} height={grande ? 24 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
      <span className="text-[8px] font-bold leading-none mt-0.5">PDF</span>
    </div>
  );
}

// ---------- Lista ----------

function ItemRelatorio({
  relatorio: r,
  novo,
  podeExcluir,
  onEditar,
  onExcluir,
}: {
  relatorio: Relatorio;
  novo: boolean;
  podeExcluir: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const urlVer = `${api.urlDownload(r.id)}?inline=1`;

  const acao = "flex items-center gap-1.5 text-sm font-medium";
  const selo = (
    <span className="text-xs font-semibold text-violet-700 bg-violet-50 rounded-full px-3 py-1">{anoDo(r)}</span>
  );

  return (
    <li className="bg-white border border-gray-200 rounded-2xl shadow-sm md:rounded-none md:shadow-none md:bg-transparent md:border-x-0 md:border-b-0 md:border-gray-100 md:first:border-t-0 p-4 md:px-6 md:py-5">
      <div className="flex items-start md:items-center gap-4">
        <span className="hidden md:block">
          <IconePdf />
        </span>
        <div className="min-w-0 flex-1">
          {/* Celular: ícone, ano e menu "⋯" em cima */}
          <div className="md:hidden flex items-center justify-between mb-3">
            <IconePdf />
            <div className="flex items-center gap-2 relative">
              {selo}
              <button onClick={() => setMenuAberto((a) => !a)} aria-label="Ações" aria-expanded={menuAberto} className="p-1 text-gray-500">
                <IconeTresPontos />
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-9 z-10 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                  <a href={urlVer} target="_blank" rel="noopener noreferrer" className={`${acao} px-4 py-2.5 text-violet-700 hover:bg-gray-50`}>
                    <IconeOlho /> Ver
                  </a>
                  <button
                    onClick={() => {
                      setMenuAberto(false);
                      onEditar();
                    }}
                    className={`${acao} w-full px-4 py-2.5 text-violet-700 hover:bg-gray-50`}
                  >
                    <IconeLapis /> Editar
                  </button>
                  {podeExcluir && (
                    <button
                      onClick={() => {
                        setMenuAberto(false);
                        onExcluir();
                      }}
                      className={`${acao} w-full px-4 py-2.5 text-red-600 hover:bg-gray-50`}
                    >
                      <IconeLixeira /> Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="font-semibold text-gray-800 flex flex-wrap items-center gap-2">
            {r.titulo}
            {novo && (
              <span className="text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2.5 py-0.5">Novo</span>
            )}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Publicado em {formatarData(r.publicadoEm)} · {formatarTamanho(r.tamanhoBytes)}
          </p>
        </div>

        {/* Computador: ano e ações na mesma linha */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {selo}
          <a href={urlVer} target="_blank" rel="noopener noreferrer" className={`${acao} text-violet-700 hover:underline`}>
            <IconeOlho /> Ver
          </a>
          <button onClick={onEditar} className={`${acao} text-violet-700 hover:underline`}>
            <IconeLapis /> Editar
          </button>
          {podeExcluir && (
            <button onClick={onExcluir} className={`${acao} text-red-600 hover:underline`}>
              <IconeLixeira /> Excluir
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ---------- Modais ----------

function ModalEditar({
  relatorio,
  onFechar,
  onSalvo,
  onSessaoExpirada,
}: {
  relatorio: Relatorio;
  onFechar: () => void;
  onSalvo: (r: Relatorio) => void;
  onSessaoExpirada: () => void;
}) {
  const [titulo, setTitulo] = useState(relatorio.titulo);
  const [descricao, setDescricao] = useState(relatorio.descricao ?? "");
  const [ano, setAno] = useState(relatorio.ano ? String(relatorio.ano) : "");
  const [erros, setErros] = useState<{ titulo?: string; ano?: string }>({});
  const [erroApi, setErroApi] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validarCampos(titulo, ano);
    setErros(v);
    if (Object.keys(v).length > 0) return;
    setSalvando(true);
    setErroApi("");
    try {
      onSalvo(
        await api.editarRelatorio(relatorio.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          ano: ano.trim() ? Number(ano) : undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessaoExpirada();
      setErroApi(err instanceof Error ? err.message : "Não foi possível salvar.");
      setSalvando(false);
    }
  }

  return (
    <Modal onFechar={onFechar} largura="max-w-[520px]">
      <form onSubmit={salvar} noValidate>
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl font-bold text-gray-800">Editar relatório</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-500 hover:text-gray-700 p-1">
            <IconeFechar tamanho={20} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <CamposRelatorio
            titulo={titulo}
            descricao={descricao}
            ano={ano}
            erros={erros}
            desabilitado={salvando}
            onTitulo={(t) => {
              setTitulo(t);
              setErros((x) => ({ ...x, titulo: undefined }));
            }}
            onDescricao={setDescricao}
            onAno={(a) => {
              setAno(a);
              setErros((x) => ({ ...x, ano: undefined }));
            }}
          />
        </div>

        <p className="mt-5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3">
          <IconeAlerta /> Para trocar o PDF, exclua este relatório e publique de novo.
        </p>

        {erroApi && <Aviso>{erroApi}</Aviso>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir({
  relatorio,
  onFechar,
  onExcluido,
  onSessaoExpirada,
}: {
  relatorio: Relatorio;
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
      await api.excluirRelatorio(relatorio.id);
      onExcluido(relatorio.id);
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
      <h2 className="mt-5 font-serif text-2xl font-bold text-gray-800">Excluir este relatório?</h2>
      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        {relatorio.titulo}. Ele deixa de aparecer na página pública e o PDF é apagado do servidor. Essa ação não pode
        ser desfeita.
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onFechar}
          className="border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-semibold rounded-full px-5 py-2.5"
        >
          Cancelar
        </button>
        <button
          onClick={excluir}
          disabled={excluindo}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 disabled:opacity-60 disabled:cursor-wait"
        >
          {excluindo ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </Modal>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <IconeAlerta /> {children}
    </p>
  );
}

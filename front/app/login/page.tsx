"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function LoginAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarDeMim, setLembrarDeMim] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await api.login(email, senha, lembrarDeMim);
      // TODO: trocar para o painel administrativo quando a página existir
      router.push("/dashboard");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  return (
    <main
      className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
    >
      {/* Camada de gradiente sobre a foto de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-violet-700/70 to-fuchsia-600/70" />

      {/* Cabeçalho fixo sobre a imagem */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 text-white text-sm z-10">
        <Link href="/" className="flex items-center gap-2 hover:text-white/80">
          ← Voltar para a Home
        </Link>
        <span className="flex items-center gap-2 font-medium tracking-wide">
          ⚙ PORTAL DE TURISMO
        </span>
      </div>

      {/* Card de login */}
      <form
        onSubmit={entrar}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 px-8 py-10"
      >
        <h1 className="text-center font-serif text-2xl font-bold text-gray-800 mb-1">
          O Vale da Eletrônica
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          Painel Administrativo
        </p>

        <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-1">
          E-MAIL
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 mb-5 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-1">
          SENHA
        </label>
        <div className="relative mb-4">
          <input
            type={mostrarSenha ? "text" : "password"}
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? "🙈" : "👁"}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6 text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={lembrarDeMim}
              onChange={() => setLembrarDeMim(!lembrarDeMim)}
              className="accent-violet-600"
            />
            Lembrar de mim
          </label>
          <a href="#" className="text-violet-600 underline hover:text-violet-700">
            Esqueceu sua senha?
          </a>
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 transition text-white font-semibold rounded-full py-3 disabled:opacity-60 disabled:cursor-wait"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Acesso restrito a administradores
        </p>
      </form>
    </main>
  );
}
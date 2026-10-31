import type { Metadata } from "next";
import Link from "next/link";

// Página informativa (sem API) sobre os cadastros federais do turismo que os
// prestadores de Santa Rita do Sapucaí precisam conhecer.
// Fontes: Ministério do Turismo (Cadastur) e notícias da obrigatoriedade da FNRH Digital (abril/2026).

export const metadata: Metadata = {
  title: "Cadastur e FNRH Digital | Observatório do Turismo de Santa Rita do Sapucaí",
  description: "O que são o Cadastur e a FNRH Digital, quem precisa se cadastrar e onde fazer.",
};

const OBRIGATORIOS = [
  "Meios de hospedagem (hotéis, pousadas, hostels…)",
  "Agências de turismo",
  "Transportadoras turísticas",
  "Organizadoras de eventos",
  "Parques temáticos",
  "Acampamentos turísticos",
  "Guias de turismo",
];

const OPCIONAIS = [
  "Restaurantes, cafeterias, bares e similares",
  "Casas de espetáculo e centros de convenções",
  "Empreendimentos de entretenimento e lazer e parques aquáticos",
  "Locadoras de veículos para turistas",
  "Prestadoras de infraestrutura para eventos",
  "Prestadoras especializadas em segmentos turísticos",
  "Apoio ao turismo náutico ou à pesca desportiva",
];

export default function CadasturPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white px-6 pt-6 pb-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">🏛</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Santa Rita do Sapucaí</p>
              <p className="text-xs text-white/70">Observatório do Turismo</p>
            </div>
          </Link>
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Voltar para a Home
          </Link>
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">Cadastur e FNRH Digital</h1>
          <p className="text-white/90 text-sm max-w-2xl mx-auto">
            Dois cadastros do Ministério do Turismo que ajudam a formalizar o turismo da cidade e geram os dados que o
            Observatório usa para planejar o setor.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-12 space-y-6">
        {/* Cadastur */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-widest text-violet-700">PARA QUEM PRESTA SERVIÇOS TURÍSTICOS</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-gray-800">Cadastur</h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            É o cadastro nacional das pessoas e empresas que trabalham no turismo, mantido pelo Ministério do Turismo com
            os órgãos oficiais de turismo dos estados. O cadastro é <strong>gratuito</strong> e feito pela internet. Com
            ele, o negócio aparece como prestador regularizado e pode participar de programas e ações de divulgação do
            turismo.
          </p>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
              <h3 className="font-semibold text-violet-800">Obrigatório para</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                {OBRIGATORIOS.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span aria-hidden className="text-violet-600">✔</span> {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800">Opcional para</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                {OPCIONAIS.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span aria-hidden className="text-gray-400">•</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className="mt-6 font-semibold text-gray-800">Como fazer</h3>
          <ol className="mt-2 space-y-1.5 text-sm text-gray-600 list-decimal pl-5">
            <li>Acesse o site do Cadastur e entre com a sua conta gov.br.</li>
            <li>Escolha a atividade e preencha os dados do negócio (ou os seus, se for guia de turismo).</li>
            <li>Acompanhe a análise pelo próprio site e mantenha o cadastro atualizado.</li>
          </ol>
          <a
            href="https://cadastur.turismo.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block bg-gradient-to-r from-blue-700 to-fuchsia-600 hover:opacity-90 text-white text-sm font-semibold rounded-full px-6 py-2.5"
          >
            Acessar o Cadastur ↗
          </a>
        </section>

        {/* FNRH Digital */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-widest text-violet-700">PARA HOTÉIS, POUSADAS E HÓSPEDES</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-gray-800">FNRH Digital</h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            A Ficha Nacional de Registro de Hóspedes agora é digital. Desde <strong>20 de abril de 2026</strong>, todos
            os meios de hospedagem do país precisam usar a FNRH Digital no check-in, mesmo os que já têm sistema próprio.
          </p>
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            <Card titulo="Para o hóspede" texto="Pode preencher os dados antes de chegar, com a conta gov.br, e fazer o check-in mais rápido." />
            <Card titulo="Para o estabelecimento" texto="Menos papel e menos fila na recepção, e o registro de turistas estrangeiros fica mais simples." />
            <Card titulo="Para a cidade" texto="Os registros geram dados sobre quem visita a região, que ajudam no planejamento do turismo." />
          </div>
          <p className="mt-5 text-xs text-gray-500">
            Os dados seguem a Lei Geral de Proteção de Dados (LGPD), com acesso restrito a sistemas oficiais e pessoas
            autorizadas. Dúvidas sobre a adesão: procure o Ministério do Turismo ou a SMCELT.
          </p>
        </section>

        {/* Observatório */}
        <section className="rounded-2xl bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold">Veja os números do turismo da cidade</h2>
            <p className="mt-1 text-sm text-white/90">Visitantes, hospedagem, leitos, empresas e empregos, mês a mês.</p>
          </div>
          <Link
            href="/dashboard"
            className="self-start md:self-auto bg-white text-blue-800 hover:bg-gray-100 text-sm font-semibold rounded-full px-6 py-2.5"
          >
            Abrir o dashboard
          </Link>
        </section>

        <p className="text-xs text-gray-500 text-center">
          Informações do Ministério do Turismo. Regras e prazos podem mudar: confira sempre os canais oficiais.
        </p>
      </div>
    </main>
  );
}

function Card({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{texto}</p>
    </div>
  );
}

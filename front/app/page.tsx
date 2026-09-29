import Link from "next/link";

// Fotos do carrossel do hero.
// Troque o "src" pelo caminho real assim que as imagens definitivas
// estiverem em front/public/images/.
const fotosHero = [
  { nome: "Represa", src: "/images/represa.jpg" },
  { nome: "Igreja Matriz", src: "/images/igreja-matriz.jpg" },
  { nome: "Prédio histórico 1894", src: "/images/predio-1894.jpg" },
  { nome: "Voo livre", src: "/images/voo-livre.jpg" },
];

// Logos institucionais (3 níveis, conforme documento de especificação).
const logos = [
  { nome: "Observatório", src: "/images/logo-observatorio.png" },
  { nome: "Santa Rita do Sapucaí", src: "/images/logo-srs.png" },
  { nome: "Prefeitura Municipal", src: "/images/logo-prefeitura.png" },
  { nome: "SMCELT", src: "/images/logo-smcelt.png" },
  { nome: "COMTUR", src: "/images/logo-comtur.png" },
  { nome: "Caminhos da Mantiqueira", src: "/images/logo-mantiqueira.png" },
  { nome: "Minas Gerais", src: "/images/logo-minas.png" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-800 via-violet-600 to-fuchsia-600 text-white">
      {/* Título e subtítulo */}
      <section className="text-center pt-12 pb-8 px-6">
        <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-wide mb-3">
          Observatório de Turismo SRS
        </h1>
        <p className="text-white/90 text-sm md:text-base">
          Consulte indicadores turísticos, dashboards e relatórios da região
          de Santa Rita do Sapucaí
        </p>
      </section>

      {/* Hero: carrossel + card de destaque */}
      <section className="px-6 pb-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 max-w-6xl mx-auto">
        {/* Carrossel de fotos */}
        <div className="flex rounded-xl overflow-hidden h-72 lg:h-auto">
          {fotosHero.map((foto) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={foto.nome}
              src={foto.src}
              alt={foto.nome}
              className="flex-1 w-1/4 h-full object-cover"
            />
          ))}
        </div>

        {/* Card "O Vale da Eletrônica" */}
        <div className="bg-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">
              O Vale da Eletrônica
            </h2>
            <p className="text-white/90 text-sm leading-relaxed mb-6">
              Cidade no sul de Minas Gerais que une tradição mineira e alta
              tecnologia. Polo de inovação, criatividade, empreendedorismo e
              hospitalidade.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href="/dashboard"
                className="bg-blue-700 hover:bg-blue-800 transition text-white font-medium text-sm rounded-full px-5 py-2"
              >
                Ver dashboard
              </Link>
              <Link
                href="/login"
                className="bg-white hover:bg-gray-100 transition text-blue-800 font-medium text-sm rounded-full px-5 py-2"
              >
                Login ADM
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 text-center border-t border-white/20 pt-4">
            <div>
              <p className="text-2xl font-bold text-amber-300">12+</p>
              <p className="text-xs text-white/70">Indicadores</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-300">50+</p>
              <p className="text-xs text-white/70">Relatórios</p>
            </div>
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-white/70">Dashboards</p>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-white/20 max-w-6xl mx-auto" />

      {/* Texto institucional */}
      <section className="text-center px-6 py-12 max-w-3xl mx-auto">
        <h3 className="font-serif text-xl font-bold text-amber-300 mb-4">
          Santa Rita do Sapucaí: O Vale da Eletrônica
        </h3>
        <p className="text-white/90 text-sm leading-relaxed">
          Conhecida carinhosamente como o &quot;Vale da Eletrônica&quot;,
          Santa Rita do Sapucaí é uma encantadora cidade no sul de Minas
          Gerais que consegue unir, de forma única, a tradição mineira e a
          alta tecnologia. Cercada pelas montanhas da Serra da Mantiqueira, a
          cidade é um polo de inovação que respira criatividade,
          empreendedorismo e hospitalidade.
        </p>
      </section>

      {/* Realização e apoio institucional */}
      <section className="px-6 pb-10">
        <p className="text-center text-xs tracking-widest text-white/60 mb-6">
          REALIZAÇÃO E APOIO INSTITUCIONAL
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 max-w-5xl mx-auto">
          {logos.map((logo) => (
            <div key={logo.nome} className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.src} alt={logo.nome} className="h-10 object-contain" />
              <span className="text-[11px] text-white/70">{logo.nome}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-black/20 text-center text-xs text-white/70 py-4">
        © 2026 Observatório de Turismo de Santa Rita do Sapucaí - Todos os
        direitos reservados
      </footer>
    </main>
  );
}
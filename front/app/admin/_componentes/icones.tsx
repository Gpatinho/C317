// Ícones do painel (SVG simples, sem biblioteca), no estilo dos ícones Lucide.

const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconeMenu() {
  return (
    <svg {...svg} width={22} height={22}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
export function IconeFechar({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg {...svg} width={tamanho} height={tamanho}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
export function IconeCasa() {
  return (
    <svg {...svg}>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
export function IconeBarras() {
  return (
    <svg {...svg}>
      <path d="M5 20v-4M12 20V8M19 20V4" />
    </svg>
  );
}
export function IconeMais() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
export function IconeUpload() {
  return (
    <svg {...svg}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
export function IconeArquivoUpload() {
  return (
    <svg {...svg}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" />
    </svg>
  );
}
export function IconeExterno() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
export function IconeSair() {
  return (
    <svg {...svg}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function IconeCaixa() {
  return (
    <svg {...svg}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
export function IconeDocumento() {
  return (
    <svg {...svg}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}
export function IconeGrafico() {
  return (
    <svg {...svg}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </svg>
  );
}
export function IconeRelogio() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
export function IconeAlerta() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
export function IconeCheck() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
export function IconePrancheta() {
  return (
    <svg {...svg} width={26} height={26}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4" />
    </svg>
  );
}
export function IconeLapis() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}
export function IconeLixeira({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg {...svg} width={tamanho} height={tamanho}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}
export function IconeBusca() {
  return (
    <svg {...svg} width={16} height={16}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
export function IconeFiltro() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
export function IconeOlho() {
  return (
    <svg {...svg} width={16} height={16}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconeImagem() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
export function IconeTresPontos() {
  return (
    <svg {...svg}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}
export function IconeCarregando() {
  return (
    <svg {...svg} className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}
export function IconeMapa() {
  return (
    <svg {...svg}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
export function IconeUsuarios() {
  return (
    <svg {...svg}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
export function IconeCalendario() {
  return (
    <svg {...svg}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
export function IconeChave() {
  return (
    <svg {...svg}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

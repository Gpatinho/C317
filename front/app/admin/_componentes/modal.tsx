"use client";

import { useEffect, type ReactNode } from "react";

// Janela sobre a tela com fundo escurecido. Fecha clicando fora ou com a tecla Esc.
// largura: classe do Tailwind, ex.: "max-w-[520px]"
export function Modal({ onFechar, largura, children }: { onFechar: () => void; largura: string; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-gray-900/50" />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${largura} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 sm:p-7`}
      >
        {children}
      </div>
    </div>
  );
}

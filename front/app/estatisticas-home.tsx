"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Contadores do card de destaque da home, vindos da API.
// Enquanto carrega (ou se a API estiver fora do ar) mostra "—".
export function EstatisticasHome() {
  const [totais, setTotais] = useState<{ indicadores: number; relatorios: number; categorias: number }>();

  useEffect(() => {
    Promise.all([api.indicadores(), api.relatorios(), api.categorias()])
      .then(([indicadores, relatorios, categorias]) =>
        setTotais({
          indicadores: indicadores.length,
          relatorios: relatorios.length,
          categorias: categorias.length,
        }),
      )
      .catch(() => {});
  }, []);

  const itens = [
    { rotulo: "Indicadores", valor: totais?.indicadores, cor: "text-amber-300" },
    { rotulo: "Relatórios", valor: totais?.relatorios, cor: "text-cyan-300" },
    { rotulo: "Setores", valor: totais?.categorias, cor: "" },
  ];

  return (
    <div className="grid grid-cols-3 text-center border-t border-white/20 pt-4">
      {itens.map((item) => (
        <div key={item.rotulo}>
          <p className={`text-2xl font-bold ${item.cor}`}>{item.valor ?? "—"}</p>
          <p className="text-xs text-white/70">{item.rotulo}</p>
        </div>
      ))}
    </div>
  );
}

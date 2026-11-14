// Regra da rejeição de um envio, separada da tela para poder ser testada.
// O motivo é mostrado ao estabelecimento, então precisa dizer alguma coisa.
export function validarMotivo(motivo: string): string | undefined {
  if (motivo.trim().length < 3) return "Explique o motivo da rejeição.";
}

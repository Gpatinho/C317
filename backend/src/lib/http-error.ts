// Erro com status HTTP, lançado nas rotas e tratado no errorHandler.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

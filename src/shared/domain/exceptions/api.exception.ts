/** Excepción de dominio base. Lanzar desde servicios y use-cases. */
export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

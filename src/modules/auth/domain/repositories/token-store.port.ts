/** Puerto del almacén de tokens.
 *  Gestiona blacklist de access tokens y refresh tokens activos. */
export const TOKEN_STORE_PORT = 'TOKEN_STORE_PORT';

export interface TokenStorePort {
  /** Añade un access token a la blacklist hasta su expiración */
  blacklistAccessToken(token: string, expiresAt: Date): void;

  /** Comprueba si un access token ha sido revocado */
  isAccessTokenBlacklisted(token: string): boolean;

  /** Registra un refresh token activo */
  registerRefreshToken(jti: string, userId: string): void;

  /** Verifica si un refresh token sigue activo (no ha sido revocado) */
  isRefreshTokenActive(jti: string): boolean;

  /** Revoca un refresh token (logout) */
  revokeRefreshToken(jti: string): void;
}

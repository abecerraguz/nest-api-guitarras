import { Injectable, OnModuleInit } from '@nestjs/common';
import { TokenStorePort } from '../../domain/repositories/token-store.port';

/** Implementación en memoria del TokenStorePort.
 *  Para entornos multi-instancia (Azure App Service con múltiples pods),
 *  reemplazar con un adaptador Redis. */
@Injectable()
export class InMemoryTokenStoreService implements TokenStorePort, OnModuleInit {
  /** token → timestamp de expiración */
  private readonly blacklistedTokens = new Map<string, number>();

  /** jti → userId */
  private readonly activeRefreshTokens = new Map<string, string>();

  onModuleInit(): void {
    // Limpieza de tokens expirados cada 15 minutos
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  blacklistAccessToken(token: string, expiresAt: Date): void {
    this.blacklistedTokens.set(token, expiresAt.getTime());
  }

  isAccessTokenBlacklisted(token: string): boolean {
    const expiresAt = this.blacklistedTokens.get(token);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) {
      this.blacklistedTokens.delete(token);
      return false;
    }
    return true;
  }

  registerRefreshToken(jti: string, userId: string): void {
    this.activeRefreshTokens.set(jti, userId);
  }

  isRefreshTokenActive(jti: string): boolean {
    return this.activeRefreshTokens.has(jti);
  }

  revokeRefreshToken(jti: string): void {
    this.activeRefreshTokens.delete(jti);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.blacklistedTokens.entries()) {
      if (expiresAt < now) this.blacklistedTokens.delete(token);
    }
  }
}

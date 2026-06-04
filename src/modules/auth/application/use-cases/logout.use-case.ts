import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  TOKEN_STORE_PORT,
  TokenStorePort,
} from '../../domain/repositories/token-store.port';

interface AccessTokenPayload {
  exp: number;
  jti?: string;
}

interface RefreshTokenPayload {
  jti: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_STORE_PORT)
    private readonly tokenStore: TokenStorePort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  execute(rawAccessToken: string, rawRefreshToken?: string): void {
    // Blacklist del access token (decodificar sin verificar para obtener exp)
    try {
      const decoded = this.jwtService.decode(rawAccessToken) as AccessTokenPayload;
      if (decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        this.tokenStore.blacklistAccessToken(rawAccessToken, expiresAt);
      }
    } catch {
      // Si el token no es parseable lo ignoramos — ya no puede usarse
    }

    // Revocar refresh token si fue proporcionado
    if (rawRefreshToken) {
      try {
        const decoded = this.jwtService.verify<RefreshTokenPayload>(
          rawRefreshToken,
          { secret: this.configService.get<string>('JWT_REFRESH_SECRET') },
        );
        this.tokenStore.revokeRefreshToken(decoded.jti);
      } catch {
        // Refresh token inválido — no hay nada que revocar
      }
    }
  }
}

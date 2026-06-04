import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  TOKEN_STORE_PORT,
  TokenStorePort,
} from '../../domain/repositories/token-store.port';

export interface RefreshTokenPayload {
  sub: string;
  typ: string;
  jti: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_STORE_PORT)
    private readonly tokenStore: TokenStorePort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(rawRefreshToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    if (!this.tokenStore.isRefreshTokenActive(payload.jti)) {
      throw new UnauthorizedException('Refresh token revocado');
    }

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    const accessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        typ: 'access',
        jti: randomUUID(),
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );

    return { accessToken, expiresIn: accessExpiresIn };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InMemoryTokenStoreService } from '../services/in-memory-token-store.service';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: string;
  typ: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenStore: InMemoryTokenStoreService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtAccessPayload) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (rawToken && this.tokenStore.isAccessTokenBlacklisted(rawToken)) {
      throw new UnauthorizedException('Token revocado');
    }

    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

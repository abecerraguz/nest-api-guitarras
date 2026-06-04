import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/repositories/user.repository.port';
import {
  TOKEN_STORE_PORT,
  TokenStorePort,
} from '../../domain/repositories/token-store.port';
import { LoginDto } from '../dtos/login.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_STORE_PORT)
    private readonly tokenStore: TokenStorePort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    // Comparación de contraseña con bcrypt (timing-safe por diseño)
    const isValidPassword =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'access',
        jti: accessJti,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, typ: 'refresh', jti: refreshJti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      },
    );

    // Registrar refresh token como activo
    this.tokenStore.registerRefreshToken(refreshJti, user.id);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}

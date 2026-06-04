import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import {
  LoginRequestDto,
  LogoutRequestDto,
  RefreshTokenRequestDto,
} from '../dtos/auth-request.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuario y obtener par de tokens JWT' })
  async login(@Body() dto: LoginRequestDto) {
    const tokens = await this.loginUseCase.execute(dto);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Autenticación exitosa',
      data: tokens,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  async refresh(@Body() dto: RefreshTokenRequestDto) {
    const result = await this.refreshTokenUseCase.execute(dto.refreshToken);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Token renovado correctamente',
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión y revocar tokens' })
  async logout(@Req() req: Request, @Body() dto: LogoutRequestDto) {
    const authHeader = req.headers['authorization'];
    const rawAccessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : '';

    this.logoutUseCase.execute(rawAccessToken, dto.refreshToken);

    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Sesión cerrada correctamente',
      data: null,
    };
  }
}

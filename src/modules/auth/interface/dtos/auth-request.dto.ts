import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@guitarras.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123*' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LogoutRequestDto {
  @ApiProperty({ description: 'Refresh token a revocar (opcional)', required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'Refresh token válido' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

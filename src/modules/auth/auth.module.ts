import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserTypeOrmEntity } from './infrastructure/persistence/user.typeorm-entity';
import { UserTypeOrmRepository } from './infrastructure/persistence/user.typeorm-repository';
import { InMemoryTokenStoreService } from './infrastructure/services/in-memory-token-store.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AuthController } from './interface/controllers/auth.controller';
import { USER_REPOSITORY_PORT } from './domain/repositories/user.repository.port';
import { TOKEN_STORE_PORT } from './domain/repositories/token-store.port';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserTypeOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule sin secret global — cada use-case lo inyecta via ConfigService
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY_PORT, useClass: UserTypeOrmRepository },
    { provide: TOKEN_STORE_PORT, useClass: InMemoryTokenStoreService },
    // Expuesto como clase concreta para que JwtStrategy pueda inyectarlo directamente
    InMemoryTokenStoreService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [PassportModule, JwtModule, InMemoryTokenStoreService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

export { JwtAuthGuard, RolesGuard };

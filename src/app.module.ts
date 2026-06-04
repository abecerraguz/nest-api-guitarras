import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuitarsModule } from './modules/guitars/guitars.module';
import { AuthModule } from './modules/auth/auth.module';
import { databaseConfig } from './config/database.config';
import { SeedModule } from './database/seeds/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    AuthModule,
    GuitarsModule,
    SeedModule,
  ],
})
export class AppModule {}

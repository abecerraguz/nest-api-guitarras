import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SeedService } from './seed.service';
import { UserTypeOrmEntity } from '../../modules/auth/infrastructure/persistence/user.typeorm-entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserTypeOrmEntity])],
  providers: [SeedService],
})
export class SeedModule {}

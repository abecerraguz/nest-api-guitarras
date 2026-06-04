import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuitarTypeOrmEntity } from './infrastructure/persistence/guitar.typeorm-entity';
import { GuitarTypeOrmRepository } from './infrastructure/persistence/guitar.typeorm-repository';
import { GUITAR_REPOSITORY_PORT } from './domain/repositories/guitar.repository.port';
import { GetAllGuitarsUseCase } from './application/use-cases/get-all-guitars.use-case';
import { GetGuitarByIdUseCase } from './application/use-cases/get-guitar-by-id.use-case';
import { CreateGuitarUseCase } from './application/use-cases/create-guitar.use-case';
import { ReplaceGuitarUseCase } from './application/use-cases/replace-guitar.use-case';
import { PatchGuitarUseCase } from './application/use-cases/patch-guitar.use-case';
import { DeleteGuitarUseCase } from './application/use-cases/delete-guitar.use-case';
import { GuitarsController } from './interface/controllers/guitars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GuitarTypeOrmEntity])],
  controllers: [GuitarsController],
  providers: [
    // Bind: interfaz (puerto) → implementación concreta (adaptador)
    { provide: GUITAR_REPOSITORY_PORT, useClass: GuitarTypeOrmRepository },
    GetAllGuitarsUseCase,
    GetGuitarByIdUseCase,
    CreateGuitarUseCase,
    ReplaceGuitarUseCase,
    PatchGuitarUseCase,
    DeleteGuitarUseCase,
  ],
})
export class GuitarsModule {}

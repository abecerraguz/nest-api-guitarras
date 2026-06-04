import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';
import { CreateGuitarDto } from '../../interface/dtos/create-guitar.dto';

@Injectable()
export class CreateGuitarUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly guitarRepository: GuitarRepositoryPort,
  ) {}

  async execute(dto: CreateGuitarDto): Promise<Guitar> {
    const existing = await this.guitarRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        `Ya existe una guitarra con el nombre "${dto.name}"`,
      );
    }
    const guitar = Guitar.create(dto);
    return this.guitarRepository.save(guitar);
  }
}

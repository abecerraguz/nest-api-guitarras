import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';

@Injectable()
export class GetGuitarByIdUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly guitarRepository: GuitarRepositoryPort,
  ) {}

  async execute(id: string): Promise<Guitar> {
    const guitar = await this.guitarRepository.findById(id);
    if (!guitar) {
      throw new NotFoundException(`Guitarra con id "${id}" no encontrada`);
    }
    return guitar;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
} from '../../domain/repositories/guitar.repository.port';

@Injectable()
export class DeleteGuitarUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly guitarRepository: GuitarRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.guitarRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Guitarra con id "${id}" no encontrada`);
    }
    await this.guitarRepository.delete(id);
  }
}

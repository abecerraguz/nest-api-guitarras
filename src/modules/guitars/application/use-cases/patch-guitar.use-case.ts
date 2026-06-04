import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';
import { PatchGuitarDto } from '../../interface/dtos/patch-guitar.dto';

@Injectable()
export class PatchGuitarUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly guitarRepository: GuitarRepositoryPort,
  ) {}

  async execute(id: string, dto: PatchGuitarDto): Promise<Guitar> {
    const existing = await this.guitarRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Guitarra con id "${id}" no encontrada`);
    }

    if (dto.name) {
      const nameConflict = await this.guitarRepository.findByName(dto.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictException(
          `Ya existe una guitarra con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = existing.update(dto);
    return this.guitarRepository.save(updated);
  }
}

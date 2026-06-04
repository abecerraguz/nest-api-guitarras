import { Inject, Injectable } from '@nestjs/common';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarQueryOptions,
  GuitarRepositoryPort,
  PaginatedResult,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';

@Injectable()
export class GetAllGuitarsUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly guitarRepository: GuitarRepositoryPort,
  ) {}

  async execute(query: GuitarQueryOptions): Promise<PaginatedResult<Guitar>> {
    return this.guitarRepository.findAll(query);
  }
}

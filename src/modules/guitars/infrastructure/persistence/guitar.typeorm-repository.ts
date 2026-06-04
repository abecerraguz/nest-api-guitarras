import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  GuitarQueryOptions,
  GuitarRepositoryPort,
  PaginatedResult,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';
import { GuitarTypeOrmEntity } from './guitar.typeorm-entity';

/** Adaptador TypeORM — implementa el puerto GuitarRepositoryPort */
@Injectable()
export class GuitarTypeOrmRepository implements GuitarRepositoryPort {
  constructor(
    @InjectRepository(GuitarTypeOrmEntity)
    private readonly repo: Repository<GuitarTypeOrmEntity>,
  ) {}

  async findAll(options: GuitarQueryOptions): Promise<PaginatedResult<Guitar>> {
    const {
      q,
      sortBy = 'createdAt',
      order = 'asc',
      page = 1,
      limit = 10,
    } = options;

    const skip = (page - 1) * limit;
    const qb = this.repo.createQueryBuilder('guitar');

    if (q) {
      qb.where(
        `(guitar.name ILIKE :q
          OR guitar.brand ILIKE :q
          OR guitar.model ILIKE :q
          OR guitar.color ILIKE :q
          OR guitar.body ILIKE :q
          OR guitar.pickups ILIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const allowedSortFields = [
      'name', 'brand', 'model', 'body', 'color', 'pickups',
      'strings', 'value', 'stock', 'createdAt', 'updatedAt',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    qb.orderBy(
      `guitar.${safeSortBy}`,
      order.toUpperCase() as 'ASC' | 'DESC',
    );
    qb.skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: entities.map((e) => e.toDomain()),
      meta: {
        total,
        count: entities.length,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async findById(id: string): Promise<Guitar | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? entity.toDomain() : null;
  }

  async findByName(name: string): Promise<Guitar | null> {
    const entity = await this.repo.findOne({ where: { name: ILike(name) } });
    return entity ? entity.toDomain() : null;
  }

  async save(guitar: Guitar): Promise<Guitar> {
    const entity = GuitarTypeOrmEntity.fromDomain(guitar);
    const saved = await this.repo.save(entity);
    return saved.toDomain();
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

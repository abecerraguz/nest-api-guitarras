import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAllGuitarsUseCase } from './get-all-guitars.use-case';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
  PaginatedResult,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';

describe('GetAllGuitarsUseCase', () => {
  let useCase: GetAllGuitarsUseCase;
  let mockRepository: jest.Mocked<Pick<GuitarRepositoryPort, 'findAll'>>;

  const mockGuitar = new Guitar({
    id: 'uuid-1',
    name: 'Fender Stratocaster',
    brand: 'Fender',
    model: 'Stratocaster',
    body: 'Stratocaster',
    color: 'Sunburst',
    pickups: 'Single Coil',
    strings: 6,
    value: 1599,
    stock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockPaginatedResult: PaginatedResult<Guitar> = {
    items: [mockGuitar],
    meta: {
      total: 1,
      count: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasPrevPage: false,
      hasNextPage: false,
    },
  };

  beforeEach(async () => {
    mockRepository = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllGuitarsUseCase,
        { provide: GUITAR_REPOSITORY_PORT, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<GetAllGuitarsUseCase>(GetAllGuitarsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return paginated guitars', async () => {
    mockRepository.findAll.mockResolvedValue(mockPaginatedResult);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result).toEqual(mockPaginatedResult);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('should pass all query options to repository', async () => {
    const query = {
      q: 'fender',
      sortBy: 'name',
      order: 'asc' as const,
      page: 2,
      limit: 5,
    };
    mockRepository.findAll.mockResolvedValue({
      items: [],
      meta: { total: 0, count: 0, page: 2, limit: 5, totalPages: 0, hasPrevPage: false, hasNextPage: false },
    });

    await useCase.execute(query);

    expect(mockRepository.findAll).toHaveBeenCalledWith(query);
  });

  it('should return empty list when no guitars found', async () => {
    mockRepository.findAll.mockResolvedValue({
      items: [],
      meta: { total: 0, count: 0, page: 1, limit: 10, totalPages: 0, hasPrevPage: false, hasNextPage: false },
    });

    const result = await useCase.execute({});

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

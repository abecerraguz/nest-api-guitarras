import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateGuitarUseCase } from './create-guitar.use-case';
import {
  GUITAR_REPOSITORY_PORT,
  GuitarRepositoryPort,
} from '../../domain/repositories/guitar.repository.port';
import { Guitar } from '../../domain/entities/guitar.entity';
import { CreateGuitarDto } from '../../interface/dtos/create-guitar.dto';

describe('CreateGuitarUseCase', () => {
  let useCase: CreateGuitarUseCase;
  let mockRepository: jest.Mocked<
    Pick<GuitarRepositoryPort, 'findByName' | 'save'>
  >;

  const validDto: CreateGuitarDto = {
    name: 'Gibson Les Paul Standard',
    brand: 'Gibson',
    model: 'Les Paul Standard',
    body: 'Les Paul',
    color: 'Heritage Cherry Sunburst',
    pickups: 'Humbucker',
    strings: 6,
    value: 2499,
    stock: 3,
  };

  beforeEach(async () => {
    mockRepository = {
      findByName: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGuitarUseCase,
        { provide: GUITAR_REPOSITORY_PORT, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<CreateGuitarUseCase>(CreateGuitarUseCase);
  });

  it('should create a guitar successfully', async () => {
    mockRepository.findByName.mockResolvedValue(null);
    const savedGuitar = Guitar.create(validDto);
    mockRepository.save.mockResolvedValue(savedGuitar);

    const result = await useCase.execute(validDto);

    expect(result).toBeDefined();
    expect(result.name).toBe(validDto.name);
    expect(mockRepository.findByName).toHaveBeenCalledWith(validDto.name);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw ConflictException when name already exists', async () => {
    mockRepository.findByName.mockResolvedValue(new Guitar({ id: 'existing-id', name: validDto.name }));

    await expect(useCase.execute(validDto)).rejects.toThrow(ConflictException);
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});

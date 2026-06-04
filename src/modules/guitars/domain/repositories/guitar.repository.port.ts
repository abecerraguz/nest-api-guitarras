import { Guitar } from '../entities/guitar.entity';

export interface GuitarQueryOptions {
  q?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    count: number;
    page: number;
    limit: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}

/** Token de inyección para el puerto (interfaz) del repositorio */
export const GUITAR_REPOSITORY_PORT = 'GUITAR_REPOSITORY_PORT';

/** Puerto del repositorio de guitarras.
 *  La capa de dominio define el contrato; la infra lo implementa. */
export interface GuitarRepositoryPort {
  findAll(options: GuitarQueryOptions): Promise<PaginatedResult<Guitar>>;
  findById(id: string): Promise<Guitar | null>;
  findByName(name: string): Promise<Guitar | null>;
  save(guitar: Guitar): Promise<Guitar>;
  delete(id: string): Promise<void>;
}

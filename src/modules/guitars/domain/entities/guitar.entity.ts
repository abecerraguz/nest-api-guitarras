import { randomUUID } from 'crypto';

/** Entidad de dominio Guitar — sin decoradores de framework */
export class Guitar {
  id!: string;
  name!: string;
  brand!: string;
  model!: string;
  body!: string;
  color!: string;
  pickups!: string;
  strings!: number;
  value!: number;
  stock!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Guitar> = {}) {
    Object.assign(this, partial);
  }

  /** Factory: crea una nueva guitarra asignando id y timestamps */
  static create(
    data: Omit<Guitar, 'id' | 'createdAt' | 'updatedAt' | 'update'>,
  ): Guitar {
    return new Guitar({
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /** Retorna una copia inmutable con los cambios aplicados */
  update(
    changes: Partial<Omit<Guitar, 'id' | 'createdAt' | 'updatedAt' | 'update'>>,
  ): Guitar {
    return new Guitar({
      ...this,
      ...changes,
      updatedAt: new Date(),
    });
  }
}

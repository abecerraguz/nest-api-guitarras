import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Guitar } from '../../domain/entities/guitar.entity';

/** Entidad TypeORM — adaptador de persistencia para la entidad de dominio Guitar */
@Entity('guitars')
export class GuitarTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  body: string;

  @Column()
  color: string;

  @Column()
  pickups: string;

  @Column({ type: 'int' })
  strings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Mapea la entidad de persistencia a la entidad de dominio */
  toDomain(): Guitar {
    return new Guitar({
      id: this.id,
      name: this.name,
      brand: this.brand,
      model: this.model,
      body: this.body,
      color: this.color,
      pickups: this.pickups,
      strings: this.strings,
      value: Number(this.value),
      stock: this.stock,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /** Mapea la entidad de dominio a la entidad de persistencia */
  static fromDomain(guitar: Guitar): GuitarTypeOrmEntity {
    const entity = new GuitarTypeOrmEntity();
    entity.id = guitar.id;
    entity.name = guitar.name;
    entity.brand = guitar.brand;
    entity.model = guitar.model;
    entity.body = guitar.body;
    entity.color = guitar.color;
    entity.pickups = guitar.pickups;
    entity.strings = guitar.strings;
    entity.value = guitar.value;
    entity.stock = guitar.stock;
    entity.createdAt = guitar.createdAt;
    entity.updatedAt = guitar.updatedAt;
    return entity;
  }
}

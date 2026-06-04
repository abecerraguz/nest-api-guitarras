import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de TypeORM CLI (migraciones)
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'guitarras_db',
  entities: [__dirname + '/../**/*.typeorm-entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
});

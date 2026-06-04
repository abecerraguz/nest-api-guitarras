/** Entidad de dominio User — sin decoradores de framework */
export type UserRole = 'admin' | 'user';

export class User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }
}

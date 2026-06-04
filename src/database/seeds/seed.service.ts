import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserTypeOrmEntity } from '../../modules/auth/infrastructure/persistence/user.typeorm-entity';

/** Servicio de seed: inserta usuarios demo al arrancar si la tabla está vacía */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  private static readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly userRepo: Repository<UserTypeOrmEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedUsers();
  }

  private async seedUsers(): Promise<void> {
    const count = await this.userRepo.count();
    if (count > 0) return;

    const adminEmail = this.configService.get<string>(
      'DEMO_ADMIN_EMAIL',
      'admin@guitarras.dev',
    );
    const adminPassword = this.configService.get<string>(
      'DEMO_ADMIN_PASSWORD',
      'Admin123*',
    );
    const userEmail = this.configService.get<string>(
      'DEMO_USER_EMAIL',
      'user@guitarras.dev',
    );
    const userPassword = this.configService.get<string>(
      'DEMO_USER_PASSWORD',
      'User123*',
    );

    await this.userRepo.save([
      {
        id: randomUUID(),
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, SeedService.SALT_ROUNDS),
        role: 'admin' as const,
      },
      {
        id: randomUUID(),
        email: userEmail,
        passwordHash: await bcrypt.hash(userPassword, SeedService.SALT_ROUNDS),
        role: 'user' as const,
      },
    ]);

    this.logger.log(
      `Usuarios demo creados: ${adminEmail} (admin), ${userEmail} (user)`,
    );
  }
}

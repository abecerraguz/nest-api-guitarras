import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard que valida el JWT de acceso en el header Authorization: Bearer <token> */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

import { PartialType } from '@nestjs/swagger';
import { CreateGuitarDto } from './create-guitar.dto';

/** DTO para PATCH: todos los campos son opcionales */
export class PatchGuitarDto extends PartialType(CreateGuitarDto) {}

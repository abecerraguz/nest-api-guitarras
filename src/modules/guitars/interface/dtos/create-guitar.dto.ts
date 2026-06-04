import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateGuitarDto {
  @ApiProperty({ example: 'Fender Stratocaster American Standard' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Fender' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Stratocaster American Standard' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'Stratocaster' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 'Sunburst' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 'Single Coil' })
  @IsString()
  @IsNotEmpty()
  pickups: string;

  @ApiProperty({ example: 6, minimum: 4 })
  @IsInt()
  @Min(4)
  strings: number;

  @ApiProperty({ example: 1599, minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: 5, minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number;
}

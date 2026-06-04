import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../shared/infrastructure/decorators/roles.decorator';
import { GetAllGuitarsUseCase } from '../../application/use-cases/get-all-guitars.use-case';
import { GetGuitarByIdUseCase } from '../../application/use-cases/get-guitar-by-id.use-case';
import { CreateGuitarUseCase } from '../../application/use-cases/create-guitar.use-case';
import { ReplaceGuitarUseCase } from '../../application/use-cases/replace-guitar.use-case';
import { PatchGuitarUseCase } from '../../application/use-cases/patch-guitar.use-case';
import { DeleteGuitarUseCase } from '../../application/use-cases/delete-guitar.use-case';
import { CreateGuitarDto } from '../dtos/create-guitar.dto';
import { PatchGuitarDto } from '../dtos/patch-guitar.dto';
import { GuitarQueryDto } from '../../application/dtos/guitar-query.dto';

@ApiTags('Guitarras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'guitarras', version: '1' })
export class GuitarsController {
  constructor(
    private readonly getAllGuitarsUseCase: GetAllGuitarsUseCase,
    private readonly getGuitarByIdUseCase: GetGuitarByIdUseCase,
    private readonly createGuitarUseCase: CreateGuitarUseCase,
    private readonly replaceGuitarUseCase: ReplaceGuitarUseCase,
    private readonly patchGuitarUseCase: PatchGuitarUseCase,
    private readonly deleteGuitarUseCase: DeleteGuitarUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar guitarras con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Listado de guitarras' })
  async findAll(@Query() query: GuitarQueryDto) {
    const { items, meta } = await this.getAllGuitarsUseCase.execute(query);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Guitarras obtenidas correctamente',
      data: items,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener guitarra por ID' })
  @ApiResponse({ status: 200, description: 'Guitarra encontrada' })
  @ApiResponse({ status: 404, description: 'Guitarra no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const guitar = await this.getGuitarByIdUseCase.execute(id);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Guitarra obtenida correctamente',
      data: guitar,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nueva guitarra (solo admin)' })
  @ApiResponse({ status: 201, description: 'Guitarra creada' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async create(@Body() dto: CreateGuitarDto) {
    const guitar = await this.createGuitarUseCase.execute(dto);
    return {
      status: 'success',
      code: HttpStatus.CREATED,
      message: 'Guitarra creada correctamente',
      data: guitar,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reemplazar guitarra completa (solo admin)' })
  async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGuitarDto,
  ) {
    const guitar = await this.replaceGuitarUseCase.execute(id, dto);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Guitarra reemplazada correctamente',
      data: guitar,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar parcialmente guitarra (solo admin)' })
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchGuitarDto,
  ) {
    const guitar = await this.patchGuitarUseCase.execute(id, dto);
    return {
      status: 'success',
      code: HttpStatus.OK,
      message: 'Guitarra actualizada correctamente',
      data: guitar,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar guitarra (solo admin)' })
  @ApiResponse({ status: 204, description: 'Guitarra eliminada' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteGuitarUseCase.execute(id);
  }
}

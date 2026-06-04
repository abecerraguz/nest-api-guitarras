# Guía de Entrevista — Guitarras API (NestJS + Arquitectura Hexagonal)

> Referencia rápida para defender el proyecto en entrevista técnica.  
> Stack: **NestJS · TypeScript · TypeORM · PostgreSQL · JWT · Docker · GitHub Actions**

---

## Índice

- [Estructura del proyecto](#estructura-del-proyecto)
- [Arranque y configuración global](#arranque-y-configuración-global)
- [Configuración de base de datos](#configuración-de-base-de-datos)
- [Capa compartida (shared)](#capa-compartida-shared)
- [Módulo Guitars — Arquitectura Hexagonal](#módulo-guitars--arquitectura-hexagonal)
  - [Capa 1: Domain](#capa-1--domain)
  - [Capa 2: Application](#capa-2--application)
  - [Capa 3: Infrastructure](#capa-3--infrastructure)
  - [Capa 4: Interface](#capa-4--interface)
  - [El módulo como pegamento](#guitarsmodulets--el-pegamento)
- [Módulo Auth](#módulo-auth)
- [Flujo completo de una petición](#flujo-completo-post-apiv1guitarras)
- [Preguntas frecuentes de entrevista](#preguntas-frecuentes-de-entrevista)
- [Tabla de conceptos clave](#tabla-de-conceptos-clave)

---

## Estructura del proyecto

```
nest-api/
├── src/
│   ├── main.ts                   ← Punto de entrada, configuración global
│   ├── app.module.ts             ← Módulo raíz, registra todos los módulos
│   ├── config/                   ← Configuración de BD y TypeORM CLI
│   ├── shared/                   ← Código transversal (filtros, interceptores, decoradores)
│   ├── modules/
│   │   ├── guitars/              ← CRUD de guitarras con arquitectura hexagonal
│   │   └── auth/                 ← Autenticación JWT de doble token
│   └── database/
│       └── seeds/                ← Datos iniciales al arrancar
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/            ← Pipeline CI/CD
```

---

## Arranque y configuración global

### `src/main.ts`

Punto de entrada de la aplicación. Configura todo lo que aplica **globalmente** antes de levantar el servidor.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI }); // /api/v1/...

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // elimina campos no declarados en el DTO
    forbidNonWhitelisted: true,
    transform: true,      // convierte strings a number/boolean automáticamente
  }));

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
```

**Por qué `whitelist: true`:** si el cliente manda campos extra no declarados en el DTO, NestJS los descarta silenciosamente. Evita inyección de propiedades no esperadas.

### `src/app.module.ts`

Módulo raíz que importa y conecta todos los módulos de la aplicación.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),   // .env disponible en toda la app
    TypeOrmModule.forRootAsync({ ... }),         // conexión PostgreSQL
    AuthModule,
    GuitarsModule,
    SeedModule,
  ],
})
export class AppModule {}
```

---

## Configuración de base de datos

### `src/config/database.config.ts`

```typescript
export const databaseConfig = (configService: ConfigService) => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  database: configService.get('DB_DATABASE'),
  synchronize: process.env.NODE_ENV !== 'production',
  // En desarrollo: TypeORM sincroniza el esquema automáticamente.
  // En producción: se usan migraciones para evitar pérdida accidental de datos.
});
```

### `src/config/typeorm-cli.config.ts`

Configuración exclusiva para la CLI de TypeORM. Permite correr migraciones desde terminal:

```bash
npm run migration:generate -- --name CrearTablaGuitarras
npm run migration:run
npm run migration:revert
```

> Las migraciones son archivos versionados que describen cada cambio de esquema. Son el equivalente a un `git` para la base de datos.

---

## Capa compartida (shared)

Código reutilizable por todos los módulos: manejo de errores, formato de respuestas y decoradores de autorización.

```
shared/
├── domain/
│   └── exceptions/
│       └── api.exception.ts          ← Error de negocio con statusCode
└── infrastructure/
    ├── filters/
    │   └── http-exception.filter.ts  ← Captura todos los errores → JSON uniforme
    ├── interceptors/
    │   └── response.interceptor.ts   ← Envuelve respuestas exitosas → JSON uniforme
    └── decorators/
        └── roles.decorator.ts        ← @Roles('admin') para proteger rutas
```

### `api.exception.ts` — Error de dominio personalizado

Permite lanzar errores con código HTTP desde cualquier capa sin acoplar la lógica de negocio a NestJS:

```typescript
// Desde un caso de uso o entidad de dominio:
throw new ApiException(404, 'Guitarra no encontrada');
// El filter global lo captura y devuelve el JSON correcto automáticamente.
```

### `http-exception.filter.ts` — Formato de error uniforme

Garantiza que **todos** los errores de la API tengan la misma estructura:

```json
{
  "status": "error",
  "code": 404,
  "message": "Guitarra no encontrada",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "path": "/api/v1/guitarras/abc"
}
```

### `response.interceptor.ts` — Formato de éxito uniforme

Envuelve automáticamente cualquier respuesta exitosa:

```json
{
  "status": "success",
  "code": 200,
  "message": "Operación completada",
  "data": { ... }
}
```

### `roles.decorator.ts` — Decorador personalizado

```typescript
@Roles('admin')   // Guarda metadata: solo 'admin' puede ejecutar este handler
@Post()
create() { ... }
// RolesGuard lee esa metadata y compara con req.user.role
```

---

## Módulo Guitars — Arquitectura Hexagonal

El módulo está dividido en **4 capas**. La regla fundamental:

> **Las dependencias apuntan hacia adentro.** Infraestructura conoce a aplicación; aplicación conoce a dominio; dominio no conoce a nadie.

```
guitars/
├── domain/          ← Reglas de negocio puras. Sin NestJS, sin TypeORM.
├── application/     ← Casos de uso. Orquesta el flujo usando puertos.
├── infrastructure/  ← Implementaciones concretas (PostgreSQL, Redis, etc.)
├── interface/       ← Entrada HTTP: controladores y DTOs.
└── guitars.module.ts
```

---

### Capa 1 — Domain

**Sin dependencias externas.** Solo TypeScript puro. Aquí vive lo que el negocio considera una guitarra y qué se puede hacer con ella.

#### `domain/entities/guitar.entity.ts`

```typescript
export class Guitar {
  id: string;
  name: string;
  brand: string;
  value: number;
  stock: number;

  // Factory method: crea una guitarra nueva con ID generado automáticamente.
  static create(data: CreateGuitarProps): Guitar {
    return new Guitar({ ...data, id: randomUUID(), createdAt: new Date() });
  }

  // Devuelve una copia modificada sin mutar el original (inmutabilidad).
  update(changes: Partial<Guitar>): Guitar {
    return new Guitar({ ...this, ...changes, updatedAt: new Date() });
  }
}
```

Esta entidad no sabe si se persiste en PostgreSQL, MongoDB o un archivo de texto.

#### `domain/repositories/guitar.repository.port.ts`

Define el **contrato** (puerto) de lo que se puede hacer con guitarras en persistencia:

```typescript
export interface GuitarRepositoryPort {
  findAll(options: GuitarQueryOptions): Promise<PaginatedResult<Guitar>>;
  findById(id: string): Promise<Guitar | null>;
  findByName(name: string): Promise<Guitar | null>;
  save(guitar: Guitar): Promise<Guitar>;
  delete(id: string): Promise<void>;
}
```

Es solo una interfaz. La implementación concreta está en la capa de infraestructura.

---

### Capa 2 — Application

Cada archivo es un **caso de uso**: una acción atómica que el sistema puede realizar.

```
application/use-cases/
├── get-all-guitars.use-case.ts
├── get-guitar-by-id.use-case.ts
├── create-guitar.use-case.ts
├── replace-guitar.use-case.ts
├── patch-guitar.use-case.ts
└── delete-guitar.use-case.ts
```

#### Ejemplo: `create-guitar.use-case.ts`

```typescript
@Injectable()
export class CreateGuitarUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)
    private readonly repo: GuitarRepositoryPort,   // ← interfaz, no implementación
  ) {}

  async execute(dto: CreateGuitarDto): Promise<Guitar> {
    // Regla de negocio: nombre único
    const existing = await this.repo.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Ya existe una guitarra con ese nombre');
    }

    const guitar = Guitar.create(dto);   // crea entidad de dominio con UUID
    return this.repo.save(guitar);       // persiste a través del puerto
  }
}
```

El caso de uso no sabe qué base de datos hay detrás. Depende de la interfaz `GuitarRepositoryPort`, no de TypeORM.

---

### Capa 3 — Infrastructure

Implementaciones concretas que dependen de tecnologías externas.

```
infrastructure/
└── persistence/
    ├── guitar.typeorm-entity.ts      ← Definición de la tabla PostgreSQL
    └── guitar.typeorm-repository.ts  ← Implementa GuitarRepositoryPort con TypeORM
```

#### `guitar.typeorm-entity.ts` — Tabla de base de datos

```typescript
@Entity('guitars')
export class GuitarTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @CreateDateColumn()
  createdAt: Date;

  // Conversión bidireccional entre BD y dominio
  toDomain(): Guitar {
    return new Guitar({ ...this });
  }

  static fromDomain(guitar: Guitar): GuitarTypeOrmEntity {
    const entity = new GuitarTypeOrmEntity();
    Object.assign(entity, guitar);
    return entity;
  }
}
```

#### `guitar.typeorm-repository.ts` — Adaptador concreto

```typescript
@Injectable()
export class GuitarTypeOrmRepository implements GuitarRepositoryPort {

  async findAll({ q, page, limit, sortBy, order }): Promise<PaginatedResult<Guitar>> {
    const [entities, total] = await this.repo
      .createQueryBuilder('guitar')
      .where('guitar.name ILIKE :q', { q: `%${q}%` })
      .orderBy(`guitar.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: entities.map(e => e.toDomain()),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async save(guitar: Guitar): Promise<Guitar> {
    const entity = GuitarTypeOrmEntity.fromDomain(guitar); // dominio → BD
    const saved = await this.repo.save(entity);
    return saved.toDomain();                               // BD → dominio
  }
}
```

---

### Capa 4 — Interface

Todo lo relacionado con la entrada y salida HTTP.

```
interface/
├── controllers/
│   └── guitars.controller.ts
└── dtos/
    ├── create-guitar.dto.ts     ← Validación para POST y PUT
    ├── patch-guitar.dto.ts      ← Validación para PATCH (todos opcionales)
    └── guitar-query.dto.ts      ← Validación de query params
```

#### `create-guitar.dto.ts` — Validación automática

```typescript
export class CreateGuitarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @IsInt()
  @Min(0)
  stock: number;
}
```

`ValidationPipe` rechaza automáticamente cualquier request que no cumpla estas reglas, devolviendo un `422` con detalle de cada campo inválido.

#### `guitars.controller.ts` — Rutas HTTP

```typescript
@Controller({ path: 'guitarras', version: '1' })
@UseGuards(JwtAuthGuard)
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
  findAll(@Query() query: GuitarQueryDto) {
    return this.getAllGuitarsUseCase.execute(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getGuitarByIdUseCase.execute(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateGuitarDto) {
    return this.createGuitarUseCase.execute(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  replace(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateGuitarDto) {
    return this.replaceGuitarUseCase.execute(id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchGuitarDto) {
    return this.patchGuitarUseCase.execute(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteGuitarUseCase.execute(id);
  }
}
```

---

### `guitars.module.ts` — El pegamento

Conecta las 4 capas mediante inyección de dependencias. NestJS lee este archivo para saber qué instanciar y cómo conectarlo.

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([GuitarTypeOrmEntity]),
  ],
  providers: [
    // Vincula el puerto (interfaz) con el adaptador (implementación concreta)
    {
      provide: GUITAR_REPOSITORY_PORT,
      useClass: GuitarTypeOrmRepository,
    },
    // Casos de uso
    GetAllGuitarsUseCase,
    GetGuitarByIdUseCase,
    CreateGuitarUseCase,
    ReplaceGuitarUseCase,
    PatchGuitarUseCase,
    DeleteGuitarUseCase,
  ],
  controllers: [GuitarsController],
})
export class GuitarsModule {}
```

Si mañana se cambia PostgreSQL por MongoDB, solo se cambia `useClass: GuitarTypeOrmRepository` por `useClass: MongoGuitarRepository`. Los casos de uso y el dominio no se tocan.

---

## Módulo Auth

Misma estructura hexagonal que `guitars/`. Implementa autenticación con **par de tokens JWT**.

```
auth/
├── domain/
│   ├── entities/user.entity.ts
│   └── repositories/
│       ├── user.repository.port.ts        ← buscar usuario por email/id
│       └── token-store.port.ts            ← blacklist de tokens revocados
├── application/use-cases/
│   ├── login.use-case.ts
│   ├── refresh-token.use-case.ts
│   └── logout.use-case.ts
├── infrastructure/
│   ├── persistence/                       ← tabla users en PostgreSQL
│   ├── services/
│   │   └── in-memory-token-store.ts       ← tokens revocados en memoria
│   ├── strategies/
│   │   └── jwt.strategy.ts                ← validación del JWT con Passport
│   └── guards/
│       ├── jwt-auth.guard.ts              ← ¿tiene token válido?
│       └── roles.guard.ts                 ← ¿tiene el rol requerido?
└── interface/
    └── controllers/auth.controller.ts     ← POST /auth/login, /refresh, /logout
```

### Sistema de doble token JWT

```
LOGIN
  ↓ email + password
  ↓ bcrypt.compare() — verifica contraseña
  ↓ genera:
      access_token  → expira en 15 min (para peticiones)
      refresh_token → expira en 7 días  (para renovar el access_token)

PETICIÓN AUTENTICADA
  ↓ Authorization: Bearer <access_token>
  ↓ JwtStrategy verifica firma y expiración
  ↓ comprueba que el token no esté en la blacklist
  ↓ inyecta req.user = { id, email, role }

LOGOUT
  ↓ access_token  → se añade a la blacklist (invalidado inmediatamente)
  ↓ refresh_token → se elimina del almacén activo
```

**Por qué dos tokens:**
El `access_token` tiene vida corta (15 min) para minimizar el riesgo si es interceptado. El `refresh_token` tiene vida larga (7 días) pero solo sirve para obtener un nuevo `access_token`, nunca para acceder a recursos directamente.

---

## Flujo completo: POST /api/v1/guitarras

```
Request llega al servidor
        │
        ▼
ValidationPipe          → valida body contra CreateGuitarDto
                          si falla → 422 Unprocessable Entity (automático)
        │
        ▼
JwtAuthGuard            → verifica token JWT en Authorization header
                          si falta o expiró → 401 Unauthorized (automático)
        │
        ▼
RolesGuard              → comprueba que req.user.role === 'admin'
                          si no → 403 Forbidden (automático)
        │
        ▼
GuitarsController       → extrae DTO del body, llama al caso de uso
        │
        ▼
CreateGuitarUseCase     → ¿nombre duplicado? → 409 Conflict
                        → Guitar.create(dto) → entidad con UUID
                        → repo.save(guitar)
        │
        ▼
GuitarTypeOrmRepository → Guitar → GuitarTypeOrmEntity (fromDomain)
                        → INSERT en PostgreSQL
                        → resultado → Guitar (toDomain)
        │
        ▼
ResponseInterceptor     → envuelve la respuesta exitosa

        ▼
Response 201
{
  "status": "success",
  "code": 201,
  "data": { "id": "uuid-...", "name": "Gibson Les Paul", ... }
}
```

---

## Preguntas frecuentes de entrevista

**¿Qué es la arquitectura hexagonal?**
> Es un patrón que separa el núcleo del negocio (dominio + casos de uso) de los detalles técnicos (base de datos, HTTP, mensajería). La comunicación entre capas se hace a través de interfaces (puertos), que son implementadas por adaptadores concretos. Esto hace que el dominio sea testeable sin infraestructura y que los adaptadores sean intercambiables.

**¿Por qué usas una interfaz para el repositorio?**
> El caso de uso depende de la abstracción, no de la implementación. Si mañana cambia la base de datos o necesito un mock para tests, solo creo un nuevo adaptador que implemente la misma interfaz, sin tocar ninguna línea de lógica de negocio.

**¿Qué es un módulo en NestJS?**
> Un contenedor que agrupa controladores, servicios y configuración relacionada con una funcionalidad. NestJS construye un grafo de dependencias con todos los módulos para resolver las inyecciones automáticamente.

**¿Cuándo usarías `synchronize: true`?**
> Solo en desarrollo local. En producción es peligroso porque TypeORM puede alterar o eliminar columnas automáticamente. En producción se usan migraciones para tener control total y auditabilidad de los cambios de esquema.

**¿Por qué dos tokens JWT?**
> El `access_token` vive 15 minutos: si alguien lo roba, el daño es limitado. El `refresh_token` vive 7 días pero solo sirve para obtener un nuevo `access_token`, nunca para acceder a recursos directamente. Al hacer logout, el `access_token` se invalida en la blacklist inmediatamente, sin esperar a que expire.

**¿Qué diferencia hay entre Guard, Pipe, Filter e Interceptor?**
> - **Pipe**: transforma y valida la entrada antes de llegar al handler
> - **Guard**: decide si la petición puede continuar (autenticación, autorización)
> - **Interceptor**: envuelve la ejecución, puede modificar request y response
> - **Filter**: captura excepciones y formatea la respuesta de error

---

## Tabla de conceptos clave

| Concepto | Qué es | Ejemplo en este proyecto |
|---|---|---|
| **Módulo** | Agrupa controladores + proveedores de una funcionalidad | `GuitarsModule`, `AuthModule` |
| **Controller** | Maneja rutas HTTP | `GuitarsController` |
| **Provider / Service** | Lógica inyectable | `CreateGuitarUseCase` |
| **Guard** | Decide si la petición puede continuar | `JwtAuthGuard`, `RolesGuard` |
| **Pipe** | Valida y transforma datos de entrada | `ValidationPipe` en `main.ts` |
| **Filter** | Captura excepciones | `HttpExceptionFilter` |
| **Interceptor** | Envuelve ejecución (antes y después) | `ResponseInterceptor` |
| **Decorator** | Adjunta metadatos a clases/métodos | `@Roles('admin')` |
| **DTO** | Define y valida la forma del input HTTP | `CreateGuitarDto` |
| **Entidad de dominio** | Objeto de negocio puro | `Guitar` |
| **Entidad TypeORM** | Mapeo de tabla de BD | `GuitarTypeOrmEntity` |
| **Puerto** | Interfaz que define un contrato | `GuitarRepositoryPort` |
| **Adaptador** | Implementación concreta de un puerto | `GuitarTypeOrmRepository` |
| **Caso de uso** | Acción atómica del sistema | `CreateGuitarUseCase` |
| **Seed** | Datos iniciales al arrancar | `SeedModule` |

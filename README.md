# Guía de Entrevista — Guitarras API (NestJS + Arquitectura Hexagonal)

> Referencia rápida para defender el proyecto en entrevista técnica.  
> Stack: **NestJS · TypeScript · TypeORM · PostgreSQL · JWT · Docker · GitHub Actions**

---

## Índice

- [Estructura del proyecto](#estructura-del-proyecto)
- [Arranque y configuración global](#arranque-y-configuración-global)
- [Quick Start](#quick-start)
- [Testear la API con Postman](#testear-la-api-con-postman)
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

## Quick Start

### Prerrequisitos

- **Node.js** 20 o superior
- **Docker** y **Docker Compose** (para levantar PostgreSQL)
- **npm** 10 o superior

### 1 — Clonar y dependencias

```bash
git clone <repo-url>
cd nest-api-guitarras
npm install
```

### 2 — Variables de entorno

Copia el archivo de ejemplo y ajústalo si necesitas cambiar las credenciales de base de datos o JWT:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto donde corre la API |
| `NODE_ENV` | `development` | `development` \| `production` |
| `DB_HOST` | `localhost` | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_USERNAME` | `postgres` | Usuario de PostgreSQL |
| `DB_PASSWORD` | `postgres` | Contraseña de PostgreSQL |
| `DB_DATABASE` | `guitarras_db` | Nombre de la base de datos |
| `JWT_ACCESS_SECRET` | _(generar uno nuevo)_ | Secreto para firmarsign el access token |
| `JWT_REFRESH_SECRET` | _(generar uno nuevo)_ | Secreto para firmar el refresh token |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Caducidad del access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Caducidad del refresh token |
| `DEMO_ADMIN_EMAIL` | `admin@guitarras.dev` | Email del usuario admin seed |
| `DEMO_ADMIN_PASSWORD` | `Admin123*` | Contraseña del admin |
| `DEMO_USER_EMAIL` | `user@guitarras.dev` | Email del usuario regular seed |
| `DEMO_USER_PASSWORD` | `User123*` | Contraseña del usuario regular |

### 3 — Levantar PostgreSQL

#### Opción A — Con Docker (recomendada)

```bash
docker-compose up -d postgres
```

Esto levanta solo PostgreSQL. Luego en otra terminal:

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000`. El seed creará automáticamente dos usuarios en la base de datos al arrancar.

#### Opción B — Sin Docker (PostgreSQL local o en otro lado)

1. Asegúrate de tener **PostgreSQL 16** corriendo.
2. Crea la base de datos:

```bash
createdb guitarras_db -U postgres -h localhost -p 5432
# te pedirá la contraseña (default: postgres)
```

3. Ajusta en `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=guitarras_db
```

4. Levanta la API:
```bash
npm run start:dev
```

### 4 — Levantar en desarrollo (hot-reload)

```bash
npm run start:dev
```

### 5 — Tests

```bash
npm run test              # Tests unitarios
npm run test:watch        # Tests unitarios en modo watch
npm run test:cov          # Tests con coverage
npm run test:e2e          # Tests end-to-end
npm run lint              # Linter + formateo automático
```

### 6 — Producción

```bash
npm run build
npm run start:prod
```

> En producción, cambia `synchronize: false` (usa migraciones en lugar de auto-sync) y genera secretos JWT fuertes con `openssl rand -base64 64`.

---

## Testear la API con Postman

> Base URL: `http://localhost:3000/api/v1`
> Todos los endpoints de guitarras requieren `Authorization: Bearer <access_token>`.

### Paso 1 — Login (obtener tokens)

**POST** `/api/v1/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@guitarras.dev",
  "password": "Admin123*"
}
```

**Respuesta 200:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Autenticación exitosa",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-...",
      "email": "admin@guitarras.dev",
      "role": "admin"
    }
  }
}
```

Copia el `accessToken` y configúralo en Postman como variable de colección o environment.

### Paso 2 — Crear una guitarra (solo admin)

**POST** `/api/v1/guitarras`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body:**
```json
{
  "name": "Fender Stratocaster American Standard",
  "brand": "Fender",
  "model": "Stratocaster American Standard",
  "body": "Stratocaster",
  "color": "Sunburst",
  "pickups": "Single Coil",
  "strings": 6,
  "value": 1599.99,
  "stock": 5
}
```

**Respuesta 201:**
```json
{
  "status": "success",
  "code": 201,
  "message": "Guitarra creada correctamente",
  "data": {
    "id": "uuid-...",
    "name": "Fender Stratocaster American Standard",
    "brand": "Fender",
    "value": 1599.99,
    "stock": 5,
    "createdAt": "2026-06-04T12:00:00.000Z"
  }
}
```

### Paso 3 — Listar guitarras (con paginación y búsqueda)

**GET** `/api/v1/guitarras`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Query params (todos opcionales):**

| Param | Default | Descripción |
|---|---|---|
| `q` | — | Buscar por nombre, marca, modelo o color |
| `sortBy` | `createdAt` | Campo de orden: `name`, `brand`, `value`, `createdAt` |
| `order` | `asc` | Dirección: `asc` o `desc` |
| `page` | `1` | Número de página |
| `limit` | `10` | Items por página |

**Ejemplo:** `GET /api/v1/guitarras?q=fender&page=1&limit=5&order=desc`

**Respuesta 200:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Guitarras obtenidas correctamente",
  "data": [
    {
      "id": "uuid-...",
      "name": "Fender Stratocaster American Standard",
      "brand": "Fender",
      "value": 1599.99,
      "stock": 5
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Paso 4 — Obtener guitarra por ID

**GET** `/api/v1/guitarras/:id`

**Headers:** `Authorization: Bearer {{accessToken}}`

**Respuesta 200:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Guitarra obtenida correctamente",
  "data": {
    "id": "uuid-...",
    "name": "Fender Stratocaster American Standard",
    "brand": "Fender",
    "model": "Stratocaster American Standard",
    "body": "Stratocaster",
    "color": "Sunburst",
    "pickups": "Single Coil",
    "strings": 6,
    "value": 1599.99,
    "stock": 5,
    "createdAt": "2026-06-04T12:00:00.000Z"
  }
}
```

### Paso 5 — Actualizar parcialmente (PATCH)

**PATCH** `/api/v1/guitarras/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body (campos parciales):**
```json
{
  "stock": 3,
  "value": 1499.99
}
```

### Paso 6 — Eliminar guitarra

**DELETE** `/api/v1/guitarras/:id`

**Headers:** `Authorization: Bearer {{accessToken}}`

**Respuesta 204** (sin contenido)

### Paso 7 — Renovar access token

**POST** `/api/v1/auth/refresh`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta 200:** nuevo par de tokens.

### Paso 8 — Logout

**POST** `/api/v1/auth/logout`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body (opcional, para revoke también el refresh token):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Resumen de endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | No | Login, devuelve access + refresh token |
| POST | `/api/v1/auth/refresh` | No | Renovar tokens con refresh token |
| POST | `/api/v1/auth/logout` | Sí | Revocar sesión |
| GET | `/api/v1/guitarras` | Sí | Listar guitarras (paginación, búsqueda) |
| GET | `/api/v1/guitarras/:id` | Sí | Obtener guitarra por ID |
| POST | `/api/v1/guitarras` | Sí (admin) | Crear guitarra |
| PUT | `/api/v1/guitarras/:id` | Sí (admin) | Reemplazar guitarra completa |
| PATCH | `/api/v1/guitarras/:id` | Sí (admin) | Actualizar guitarra parcial |
| DELETE | `/api/v1/guitarras/:id` | Sí (admin) | Eliminar guitarra |

### Usuarios de prueba

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@guitarras.dev` | `Admin123*` |
| User | `user@guitarras.dev` | `User123*` |

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

## Banco de preguntas de entrevista por área

> Lee la pregunta, intenta responder en voz alta, luego compara con la respuesta modelo.

---

### 🔧 NestJS & Backend

**1. ¿Cómo estructurarías un módulo en NestJS siguiendo arquitectura hexagonal?**

Lo divido en cuatro carpetas: `domain` con las entidades e interfaces de repositorio en TypeScript puro, `application` con los casos de uso, `infrastructure` con las implementaciones concretas como TypeORM, e `interface` con el controller y los DTOs. El módulo de NestJS actúa de pegamento: vincula la interfaz del repositorio con su implementación vía inyección de dependencias.

---

**2. ¿Qué son los pipes globales y para qué sirve `ValidationPipe`?**

Los pipes se ejecutan antes de que la petición llegue al controller. `ValidationPipe` valida el body contra las reglas del DTO y devuelve un 422 automáticamente si algo no cumple, sin escribir esa lógica en ningún side. Uso `whitelist: true` para descartar campos no declarados y `transform: true` para convertir tipos automáticamente.

---

**3. ¿Cuál es la diferencia entre scope DEFAULT, REQUEST y TRANSIENT?**

DEFAULT crea un singleton por módulo, es el más eficiente y el que uso en este proyecto. REQUEST crea una instancia nueva por cada petición HTTP, útil cuando necesito contexto de la request. TRANSIENT crea una instancia nueva cada vez que alguien inyecta esa clase. Para la mayoría de casos, DEFAULT es suficiente.

---

**4. ¿Cómo implementarías manejo de errores global en NestJS?**

Creo una clase que implementa `ExceptionFilter`, la decoro con `@Catch()` y la registro en `main.ts` con `useGlobalFilters`. Desde ahí capturo cualquier excepción y devuelvo siempre el mismo JSON con `status`, `code`, `message`, `timestamp` y `path`. En este proyecto además tengo una clase `ApiException` para lanzar errores de negocio con su código HTTP desde los casos de uso.

---

**5. ¿En qué se diferencian Guard e Interceptor?**

El Guard decide si la petición puede continuar, devuelve true o false. El Interceptor envuelve la ejecución y puede actuar antes y después del handler. En este proyecto, `JwtAuthGuard` y `RolesGuard` son guards; `ResponseInterceptor`, que formatea todas las respuestas exitosas, es un interceptor.

---

**6. ¿Cómo implementarías comunicación entre microservicios en NestJS?**

Para comunicación sincrónica usaría HTTP o gRPC. Para asíncrona, en Azure usaría Service Bus con colas para mensajes punto a punto o topics para pub/sub. NestJS tiene soporte nativo con `ClientProxy`. Si la separación es dentro del mismo servicio, también consideraría CQRS con `@nestjs/cqrs`.

---

### 🏛️ Arquitectura hexagonal

**7. ¿Qué es la regla de dependencia?**

Las dependencias siempre apuntan hacia adentro: infraestructura conoce a aplicación, aplicación conoce a dominio, pero el dominio no importa nada externo. En la práctica, si abro `guitar.entity.ts` y no veo ningún import de NestJS ni TypeORM, la arquitectura está bien aplicada.

---

**8. Dame un ejemplo concreto de puerto y adaptador en este proyecto.**

El puerto es `GuitarRepositoryPort`, una interfaz en dominio que define `findAll`, `findById`, `save` y `delete`. El adaptador es `GuitarTypeOrmRepository`, que implementa esa interfaz con TypeORM. En el módulo vinculo ambos con `provide/useClass`, así los casos de uso nunca saben que existe TypeORM.

---

**9. ¿Cómo evitas que la lógica de negocio se filtre hacia infraestructura?**

La lógica vive en la entidad y en los casos de uso. `Guitar.create()` genera el UUID, `CreateGuitarUseCase` valida que no haya nombre duplicado. Los adaptadores solo traducen entre formatos con `toDomain()` y `fromDomain()`, sin ninguna regla de negocio dentro.

---

**10. ¿Cómo harías testing de los casos de uso sin base de datos?**

Creo un repositorio in-memory que implementa `GuitarRepositoryPort` con un simple array. En el test inyecto ese repositorio en lugar del real y puedo probar toda la lógica de negocio en milisegundos, sin levantar ninguna infraestructura.

---

### ☁️ Azure & Cloud

**11. ¿Cuándo elegirías Azure App Service vs Azure Functions?**

App Service para APIs con tráfico constante como esta, sin cold start. Functions para procesos esporádicos o event-driven como jobs o webhooks. NestJS específicamente no encaja bien en Functions porque su bootstrapping genera cold starts pesados.

---

**12. ¿Cómo manejarías secretos en Azure sin hardcodear credenciales?**

Con Azure Key Vault y Managed Identity. El servicio recibe una identidad en Azure AD con permisos de lectura en Key Vault, y los secretos se referencian como variables de entorno en App Service. Sin contraseñas en el código y con rotación de secretos sin necesidad de redeploy.

---

**13. ¿Cómo escalarías horizontalmente este servicio?**

Con scale out en App Service. Pero primero resolvería la deuda técnica del `in-memory-token-store`: si hay múltiples instancias, cada una tiene su propia blacklist y los tokens revocados no se comparten. La solución es mover esa blacklist a Redis, que es externo y compartido por todas las instancias.

---

### 🚀 CI/CD & DevOps

**14. Describe el pipeline CI/CD de este proyecto.**

Está en `.github/workflows/`. El flujo es: lint → tests unitarios → build TypeScript → build imagen Docker → push al container registry de Azure → deploy a App Service. Las migraciones corren como paso separado antes del deploy, no al arrancar la app, para poder hacer rollback de código sin afectar el esquema.

---

**15. ¿Por qué `synchronize: false` en producción?**

Porque con `true`, TypeORM puede alterar o eliminar columnas automáticamente si el esquema cambia, lo que puede causar pérdida de datos. Las migraciones son la alternativa segura: son versionadas, revisables en PR y reversibles con `migration:revert`.

---

### 🗄️ Bases de datos

**16. ¿Cómo manejas paginación con TypeORM?**

Con `createQueryBuilder`, `.skip()`, `.take()` y `getManyAndCount()`, que trae los registros y el total en una sola query. Con eso armo el objeto `meta` con `total`, `page` y `totalPages` que devuelvo junto a los items.

---

**17. ¿Qué problema tiene el token store en memoria al escalar?**

Que cada instancia tiene su propia memoria. Un token revocado en la instancia A sigue válido en la instancia B porque no comparten estado. La solución es Redis: externo, compartido entre instancias, y con TTL para que los tokens expirados se limpien solos.

---

### ⭐ Preguntas de comportamiento

**18. Cuéntame de un proyecto donde hayas aplicado buena separación de responsabilidades.**

En este proyecto de Guitarras API aplicamos arquitectura hexagonal para evitar servicios que mezclen validaciones, reglas de negocio y queries SQL en el mismo archivo. El resultado fue que podemos testear los casos de uso sin base de datos y cambiar la capa de persistencia sin tocar la lógica de negocio.

---

**19. ¿Cómo convencerías a tu equipo de adoptar arquitectura hexagonal en un proyecto en marcha?**

No propondría reescribir todo de golpe. Empezaría por el módulo más problemático, lo refactorizo, muestro que los tests son más rápidos y el código más legible. Con ese ejemplo concreto es mucho más fácil que el equipo quiera aplicarlo al siguiente módulo.

---

**20. ¿Qué harías si hay presión para entregar rápido y la calidad sufre?**

Hago visible la deuda técnica creando un ticket con lo que se hizo rápido y el costo estimado de arreglarlo después. Eso la convierte en algo priorizable. Y mantengo un piso mínimo innegociable: nunca `synchronize: true` en producción, nunca credenciales hardcodeadas, sin importar la presión.

---

## Respuestas rápidas frecuentes

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

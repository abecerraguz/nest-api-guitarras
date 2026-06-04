# guitarras-api — NestJS

API RESTful de guitarras migrada a NestJS + TypeScript con Arquitectura Hexagonal.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10 + TypeScript 5 |
| Base de datos | PostgreSQL 16 (TypeORM) |
| Autenticación | JWT doble token (access 15m + refresh 7d) |
| Validación | class-validator + class-transformer |
| Docs | Swagger / OpenAPI (`/api/docs`) |
| Contenedores | Docker + docker-compose |
| CI/CD | GitHub Actions + Azure App Service |

## Arquitectura Hexagonal

```
modules/<feature>/
├── domain/              ← Entidades puras + Puertos (interfaces)
│   ├── entities/
│   └── repositories/   ← Puertos: *.port.ts
├── application/         ← Casos de uso + DTOs de aplicación
│   ├── use-cases/
│   └── dtos/
├── infrastructure/      ← Adaptadores (TypeORM, guards, estrategias)
│   ├── persistence/     ← *.typeorm-entity.ts + *.typeorm-repository.ts
│   ├── guards/
│   └── strategies/
└── interface/           ← Controllers HTTP + DTOs de entrada
    ├── controllers/
    └── dtos/
```

## Inicio rápido

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar con Docker (API + PostgreSQL)
docker-compose up

# 3. O en local (requiere PostgreSQL corriendo)
npm install
npm run start:dev
```

La API corre en `http://localhost:3000/api/v1`  
Swagger en `http://localhost:3000/api/docs`

## Comandos

```bash
npm run start:dev        # Desarrollo con hot-reload
npm run build            # Compilar TypeScript → dist/
npm run start:prod       # Producción (node dist/main)
npm test                 # Tests unitarios (Jest)
npm run test:cov         # Tests con cobertura
npm run test:e2e         # Tests de integración
npm run lint             # ESLint
npm run migration:generate -- --name NombreMigracion  # Nueva migración
npm run migration:run    # Aplicar migraciones
```

## Usuarios demo (creados automáticamente al arrancar)

| Email | Contraseña | Rol |
|---|---|---|
| admin@guitarras.dev | Admin123* | admin |
| user@guitarras.dev | User123* | user |

## Endpoints principales

```
POST /api/v1/auth/login      → Obtener tokens
POST /api/v1/auth/refresh    → Renovar access token
POST /api/v1/auth/logout     → Revocar tokens

GET    /api/v1/guitarras     → Listar (auth requerida)
GET    /api/v1/guitarras/:id → Detalle
POST   /api/v1/guitarras     → Crear (solo admin)
PUT    /api/v1/guitarras/:id → Reemplazar (solo admin)
PATCH  /api/v1/guitarras/:id → Actualizar parcial (solo admin)
DELETE /api/v1/guitarras/:id → Eliminar (solo admin)
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`): lint + build + unit tests + integration tests + Docker build — se ejecuta en push a `main`/`develop`.
- **CD** (`.github/workflows/cd.yml`): push a Azure Container Registry + deploy a Azure App Service — se ejecuta solo en push a `main`.

### Secrets requeridos en GitHub

```
AZURE_CREDENTIALS    # JSON de service principal
ACR_LOGIN_SERVER     # ej: miregistry.azurecr.io
ACR_USERNAME
ACR_PASSWORD
AZURE_APP_NAME       # Nombre del App Service
```

# Guía de entrevista NestJS — Proyecto Guitarras API

> Este archivo explica **cada carpeta y archivo** del proyecto para que puedas entender qué hace cada cosa y defenderte en una entrevista técnica.

---

## Índice

### Estructura y arranque
- [Estructura completa del proyecto](#estructura-completa-del-proyecto)
- [¿Qué son los pipes globales?](#srcmaints)
- [¿Qué es un módulo en NestJS?](#srcappmodulets)

### Configuración
- [¿Cómo se configura la base de datos?](#srcconfig)
- [¿Qué es `synchronize` en TypeORM?](#databaseconfigts)
- [¿Para qué sirven las migraciones?](#typeorm-cliconfigts)

### Capa compartida (shared)
- [¿Qué es un Filter en NestJS?](#http-exception-filterts--formateador-de-errores)
- [¿Qué es un Interceptor en NestJS?](#response-interceptorts--formateador-de-respuestas-exitosas)
- [¿Qué es un Decorator personalizado?](#roles-decoratorts--decorador-personalizado)

### Módulo Guitars — Arquitectura Hexagonal
- [¿Qué es la arquitectura hexagonal?](#carpeta-srcmodulesguitars)
- [¿Qué es el Domain y por qué no usa NestJS?](#capa-1--domain)
- [¿Qué es un Puerto (Port)?](#domainrepositoriesguitar-repository-portts)
- [¿Qué es un Caso de Uso (Use Case)?](#capa-2--applicationuse-cases)
- [¿Por qué usas una interfaz para el repositorio?](#domainrepositoriesguitar-repository-portts)
- [¿Qué hace el adaptador TypeORM?](#capa-3--infrastructure)
- [¿Qué es un DTO?](#interfacedtoscreate-guitar-dtots)
- [¿Qué hace el Controller?](#guitarscontrollerts)
- [¿Cómo funciona la inyección de dependencias?](#guitarsmodulets--el-pegamento)

### Módulo Auth
- [¿Por qué dos tokens JWT?](#sistema-jwt-de-doble-token)
- [¿Qué es un Guard en NestJS?](#infrastructure)
- [¿Cómo funciona el logout con JWT?](#sistema-jwt-de-doble-token)

### Flujo completo
- [¿Qué pasa desde que llega una petición hasta la respuesta?](#flujo-completo-de-una-petición-post-apiv1guitarras)

### Resumen rápido
- [Tabla de conceptos para la entrevista](#resumen-de-conceptos-para-la-entrevista)

---

## Estructura completa del proyecto

```
nest-api/
├── src/
│   ├── main.ts                  ← Punto de entrada
│   ├── app.module.ts            ← Módulo raíz
│   ├── config/                  ← Configuración de base de datos
│   ├── shared/                  ← Código reutilizable en todos los módulos
│   ├── modules/
│   │   ├── guitars/             ← Todo lo relacionado con guitarras
│   │   └── auth/                ← Todo lo relacionado con autenticación
│   └── database/
│       └── seeds/               ← Datos iniciales al arrancar
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/           ← CI/CD automatizado
```

---

## Archivos de arranque

### `src/main.ts`

Es el **primer archivo que ejecuta Node**. Es como el `index.js` de Express pero de NestJS.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');         // Todas las rutas empiezan con /api
  app.enableVersioning(...);           // Las rutas quedan como /api/v1/...
  app.useGlobalPipes(new ValidationPipe()); // Valida automáticamente todos los body
  app.useGlobalFilters(...);           // Captura todos los errores
  app.useGlobalInterceptors(...);      // Transforma todas las respuestas

  await app.listen(3000);
}
```

**Pregunta de entrevista:** *¿Qué son los pipes globales?*
> Son filtros que se ejecutan antes de cada controller. `ValidationPipe` revisa que el body cumpla las reglas del DTO. Si no cumple, devuelve un 400 automáticamente.

---

### `src/app.module.ts`

Es el **módulo raíz** — registra todos los demás módulos.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Variables de entorno disponibles en toda la app
    TypeOrmModule.forRootAsync({ ... }),        // Conexión a PostgreSQL
    AuthModule,                                 // Módulo de autenticación
    GuitarsModule,                              // Módulo de guitarras
    SeedModule,                                 // Datos iniciales
  ],
})
export class AppModule {}
```

**Pregunta de entrevista:** *¿Qué es un módulo en NestJS?*
> Es un contenedor que agrupa controladores, servicios y repositorios relacionados. Equivale a una "sección" de la aplicación. NestJS construye un grafo con todos los módulos para resolver las dependencias.

---

## Carpeta `src/config/`

### `database.config.ts`

Configura la conexión a PostgreSQL leyendo las variables del `.env`.

```typescript
export const databaseConfig = (configService: ConfigService) => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),      // Lee DB_HOST del .env
  port: configService.get('DB_PORT'),
  database: configService.get('DB_DATABASE'),
  synchronize: NODE_ENV !== 'production',  // En dev crea las tablas automático
                                           // En producción se usan migraciones
});
```

### `typeorm-cli.config.ts`

Solo sirve para correr comandos de migración desde la terminal:
```bash
npm run migration:generate -- --name CrearTablaGuitarras
npm run migration:run
```

---

## Carpeta `src/shared/`

Código **transversal** que usan todos los módulos.

```
shared/
├── domain/
│   └── exceptions/
│       └── api.exception.ts          ← Error personalizado con statusCode
└── infrastructure/
    ├── filters/
    │   └── http-exception.filter.ts  ← Captura todos los errores y formatea la respuesta
    ├── interceptors/
    │   └── response.interceptor.ts   ← Envuelve las respuestas exitosas
    └── decorators/
        └── roles.decorator.ts        ← @Roles('admin') para proteger rutas
```

### `api.exception.ts` — Error personalizado

```typescript
// En lugar de hacer esto:
res.status(404).json({ error: 'No encontrado' })

// Hacemos esto desde cualquier servicio:
throw new ApiException(404, 'Guitarra no encontrada');
// El filter lo captura y devuelve el JSON formateado automáticamente
```

### `http-exception.filter.ts` — Formateador de errores

Captura **cualquier error** de la aplicación y devuelve siempre el mismo formato:
```json
{
  "status": "error",
  "code": 404,
  "message": "Guitarra no encontrada",
  "timestamp": "2026-06-04T...",
  "path": "/api/v1/guitarras/123"
}
```

### `response.interceptor.ts` — Formateador de respuestas exitosas

Envuelve automáticamente todas las respuestas en:
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
// Define qué roles pueden acceder a una ruta
@Roles('admin')
@Post()
create() { ... }
```

---

## Carpeta `src/modules/guitars/`

Este es el **corazón** del proyecto. Está dividido en 4 capas (arquitectura hexagonal).

```
guitars/
├── domain/          ← CAPA 1: Reglas de negocio puras
├── application/     ← CAPA 2: Casos de uso (qué puede hacer el sistema)
├── infrastructure/  ← CAPA 3: Implementaciones concretas (PostgreSQL, etc.)
├── interface/       ← CAPA 4: Entrada/salida HTTP
└── guitars.module.ts
```

---

### CAPA 1 — `domain/`

**Regla:** no importa nada de NestJS, Express ni TypeORM. Solo TypeScript puro.

#### `domain/entities/guitar.entity.ts`

La guitarra "ideal" — define qué **es** una guitarra para el negocio:

```typescript
export class Guitar {
  id: string;
  name: string;
  brand: string;
  value: number;
  stock: number;
  // ...

  // Crea una guitarra nueva con ID automático
  static create(data): Guitar {
    return new Guitar({ ...data, id: randomUUID(), createdAt: new Date() });
  }

  // Devuelve una copia modificada (no modifica el original)
  update(changes): Guitar {
    return new Guitar({ ...this, ...changes, updatedAt: new Date() });
  }
}
```

> Esta clase no sabe si se guarda en PostgreSQL, MongoDB o un archivo JSON.

#### `domain/repositories/guitar.repository.port.ts`

Define el **contrato** de lo que se puede hacer con guitarras en la base de datos:

```typescript
export interface GuitarRepositoryPort {
  findAll(options): Promise<PaginatedResult<Guitar>>;
  findById(id: string): Promise<Guitar | null>;
  findByName(name: string): Promise<Guitar | null>;
  save(guitar: Guitar): Promise<Guitar>;
  delete(id: string): Promise<void>;
}
```

> Es solo una interfaz. No tiene código real. El "cómo" se implementa está en la capa de infraestructura.

**Pregunta de entrevista:** *¿Por qué usas una interfaz para el repositorio?*
> Porque el caso de uso depende de la abstracción (interfaz), no de la implementación concreta. Si mañana cambio PostgreSQL por MongoDB, solo cambio el adaptador, sin tocar la lógica de negocio.

---

### CAPA 2 — `application/use-cases/`

Cada archivo representa **una acción** que el sistema puede hacer.

```
use-cases/
├── get-all-guitars.use-case.ts    ← Listar guitarras con filtros y paginación
├── get-guitar-by-id.use-case.ts   ← Obtener una guitarra por ID
├── create-guitar.use-case.ts      ← Crear guitarra (verifica duplicados)
├── replace-guitar.use-case.ts     ← PUT: reemplazar guitarra completa
├── patch-guitar.use-case.ts       ← PATCH: actualizar campos sueltos
└── delete-guitar.use-case.ts      ← Eliminar guitarra
```

Ejemplo del caso de uso de crear:

```typescript
@Injectable()
export class CreateGuitarUseCase {
  constructor(
    @Inject(GUITAR_REPOSITORY_PORT)   // ← Recibe la INTERFAZ, no la clase concreta
    private readonly repo: GuitarRepositoryPort,
  ) {}

  async execute(dto: CreateGuitarDto): Promise<Guitar> {
    // Regla de negocio: no pueden existir dos guitarras con el mismo nombre
    const existing = await this.repo.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Ya existe una guitarra con ese nombre');
    }

    const guitar = Guitar.create(dto);        // Crea la entidad de dominio
    return this.repo.save(guitar);            // Persiste usando el puerto
  }
}
```

**Pregunta de entrevista:** *¿Qué es un caso de uso?*
> Es una clase que encapsula una única acción del sistema. Contiene la lógica de negocio y orquesta el flujo: valida, crea entidades, llama al repositorio. Un controller puede llamar a varios casos de uso pero un caso de uso no llama a controllers.

---

### CAPA 3 — `infrastructure/`

Las implementaciones **concretas** que dependen de tecnologías externas.

```
infrastructure/
└── persistence/
    ├── guitar.typeorm-entity.ts      ← Tabla de PostgreSQL
    └── guitar.typeorm-repository.ts  ← Implementa GuitarRepositoryPort con TypeORM
```

#### `guitar.typeorm-entity.ts`

Define la tabla de PostgreSQL:

```typescript
@Entity('guitars')                        // nombre de la tabla en la BD
export class GuitarTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })               // columna con restricción UNIQUE
  name: string;

  @Column({ type: 'decimal' })
  value: number;

  @CreateDateColumn()                     // TypeORM la rellena automáticamente
  createdAt: Date;

  // Convierte fila de BD → entidad de dominio
  toDomain(): Guitar { return new Guitar({ ...this }); }

  // Convierte entidad de dominio → fila de BD
  static fromDomain(guitar: Guitar): GuitarTypeOrmEntity { ... }
}
```

#### `guitar.typeorm-repository.ts`

**Implementa** el puerto `GuitarRepositoryPort` usando TypeORM y PostgreSQL:

```typescript
@Injectable()
export class GuitarTypeOrmRepository implements GuitarRepositoryPort {

  async findAll(options): Promise<PaginatedResult<Guitar>> {
    // Construye la query con filtros, ordenamiento y paginación
    const [entities, total] = await this.repo
      .createQueryBuilder('guitar')
      .where('guitar.name ILIKE :q', { q: `%${options.q}%` })
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: entities.map(e => e.toDomain()),    // BD → dominio
      meta: { total, page, totalPages, ... }
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

### CAPA 4 — `interface/`

Todo lo que tiene que ver con **HTTP**: recibe peticiones, devuelve respuestas.

```
interface/
├── controllers/
│   └── guitars.controller.ts    ← Define las rutas
└── dtos/
    ├── create-guitar.dto.ts     ← Reglas de validación para POST/PUT
    └── patch-guitar.dto.ts      ← Reglas de validación para PATCH (campos opcionales)
```

#### `create-guitar.dto.ts`

Define qué debe enviar el cliente y qué reglas deben cumplirse:

```typescript
export class CreateGuitarDto {
  @IsString()
  @IsNotEmpty()
  name: string;           // Obligatorio, no puede estar vacío

  @IsNumber()
  @Min(0)
  value: number;          // Obligatorio, mínimo 0

  @IsInt()
  @Min(0)
  stock: number;
}
// Si el cliente manda un campo extra que no está aquí,
// ValidationPipe lo elimina automáticamente (whitelist: true)
```

#### `guitars.controller.ts`

Recibe HTTP, llama al caso de uso correcto, devuelve JSON:

```typescript
@Controller({ path: 'guitarras', version: '1' })  // /api/v1/guitarras
@UseGuards(JwtAuthGuard)                           // Todas las rutas requieren token
export class GuitarsController {

  @Get()
  async findAll(@Query() query: GuitarQueryDto) {
    // 1. Query params validados automáticamente por ValidationPipe
    const { items, meta } = await this.getAllGuitarsUseCase.execute(query);
    // 2. Devuelve respuesta formateada
    return { status: 'success', data: items, meta };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')                                  // Solo admin puede crear
  async create(@Body() dto: CreateGuitarDto) {
    const guitar = await this.createGuitarUseCase.execute(dto);
    return { status: 'success', data: guitar };
  }
}
```

---

### `guitars.module.ts` — el pegamento

Conecta todas las capas. Le dice a NestJS:
- *"Cuando alguien pida `GuitarRepositoryPort`, dale `GuitarTypeOrmRepository`"*

```typescript
@Module({
  providers: [
    {
      provide: GUITAR_REPOSITORY_PORT,        // ← la INTERFAZ (el contrato)
      useClass: GuitarTypeOrmRepository,      // ← la IMPLEMENTACIÓN concreta
    },
    CreateGuitarUseCase,
    GetAllGuitarsUseCase,
    // ... todos los casos de uso
  ],
  controllers: [GuitarsController],
})
export class GuitarsModule {}
```

**Esto es la inyección de dependencias:** NestJS crea `GuitarTypeOrmRepository` y se lo pasa a `CreateGuitarUseCase` automáticamente, sin que tengas que escribir `new GuitarTypeOrmRepository()` en ningún lado.

---

## Carpeta `src/modules/auth/`

Misma estructura que `guitars/` pero para autenticación.

```
auth/
├── domain/
│   ├── entities/user.entity.ts              ← Entidad Usuario (id, email, role)
│   └── repositories/
│       ├── user.repository.port.ts          ← Contrato: buscar usuario por email/id
│       └── token-store.port.ts              ← Contrato: blacklist de tokens revocados
├── application/use-cases/
│   ├── login.use-case.ts                    ← Valida credenciales, genera par de tokens
│   ├── refresh-token.use-case.ts            ← Renueva el access token
│   └── logout.use-case.ts                   ← Revoca tokens
├── infrastructure/
│   ├── persistence/                         ← Tabla users en PostgreSQL
│   ├── services/
│   │   └── in-memory-token-store.service.ts ← Guarda tokens revocados en memoria
│   ├── strategies/
│   │   └── jwt.strategy.ts                  ← Cómo Passport valida el JWT
│   └── guards/
│       ├── jwt-auth.guard.ts                ← ¿Tiene token válido?
│       └── roles.guard.ts                   ← ¿Tiene el rol requerido?
└── interface/
    └── controllers/auth.controller.ts        ← POST /auth/login, /refresh, /logout
```

### Sistema JWT de doble token

```
LOGIN:
  Cliente envía email + password
       ↓
  Se verifica con bcrypt (timing-safe)
       ↓
  Se generan 2 tokens:
    access_token  (válido 15 min) → para hacer peticiones
    refresh_token (válido 7 días) → para renovar el access_token

PETICIÓN AUTENTICADA:
  Header: Authorization: Bearer <access_token>
       ↓
  JwtStrategy verifica la firma del token
       ↓
  Comprueba que no esté en la blacklist (tokens revocados)
       ↓
  Pone req.user = { id, email, role }

LOGOUT:
  access_token  → se añade a la blacklist (no sirve más)
  refresh_token → se elimina del almacén activo
```

**Pregunta de entrevista:** *¿Por qué dos tokens?*
> El access token dura poco (15 min) para minimizar el riesgo si es robado. El refresh token dura más (7 días) y solo se usa para obtener un nuevo access token, no para acceder a recursos.

---

## Carpeta `src/database/seeds/`

Se ejecuta automáticamente cuando arranca la app. Crea los usuarios demo si la tabla está vacía.

```typescript
// Si no hay ningún usuario en la BD, crea admin y user
async onApplicationBootstrap() {
  const count = await this.userRepo.count();
  if (count > 0) return;   // Ya hay datos, no hacer nada

  await this.userRepo.save([
    { email: 'admin@guitarras.dev', passwordHash: await bcrypt.hash('Admin123*', 10), role: 'admin' },
    { email: 'user@guitarras.dev',  passwordHash: await bcrypt.hash('User123*', 10),  role: 'user'  },
  ]);
}
```

---

## Flujo completo de una petición `POST /api/v1/guitarras`

```
1. main.ts          → ValidationPipe valida el body contra CreateGuitarDto
                      (si falla → 422 automático)

2. JwtAuthGuard     → verifica el token JWT en el header
                      (si falta o expiró → 401 automático)

3. RolesGuard       → verifica que req.user.role === 'admin'
                      (si no es admin → 403 automático)

4. GuitarsController.create()
                    → extrae el body ya validado
                    → llama a CreateGuitarUseCase.execute(dto)

5. CreateGuitarUseCase
                    → ¿ya existe una guitarra con ese nombre? → 409
                    → Guitar.create(dto) → nueva entidad con UUID
                    → repo.save(guitar)

6. GuitarTypeOrmRepository.save()
                    → convierte Guitar → GuitarTypeOrmEntity
                    → INSERT en PostgreSQL
                    → convierte resultado → Guitar

7. ResponseInterceptor
                    → envuelve la respuesta: { status: 'success', data: guitar }

8. Cliente recibe:
{
  "status": "success",
  "code": 201,
  "data": { "id": "uuid", "name": "...", ... }
}
```

---

## Resumen de conceptos para la entrevista

| Concepto | Qué es | Ejemplo en este proyecto |
|---|---|---|
| **Módulo** | Agrupa controladores + servicios de una funcionalidad | `GuitarsModule`, `AuthModule` |
| **Controller** | Maneja rutas HTTP | `GuitarsController` |
| **Provider / Service** | Lógica inyectable | `CreateGuitarUseCase` |
| **Guard** | Decide si la petición puede continuar | `JwtAuthGuard`, `RolesGuard` |
| **Pipe** | Valida/transforma datos de entrada | `ValidationPipe` en `main.ts` |
| **Filter** | Captura excepciones | `HttpExceptionFilter` |
| **Interceptor** | Envuelve ejecución (antes y después) | `ResponseInterceptor` |
| **Decorator** | Metadatos sobre clases/métodos | `@Roles('admin')`, `@Get(':id')` |
| **DTO** | Objeto que define la forma del input HTTP | `CreateGuitarDto` |
| **Entity (dominio)** | Objeto de negocio puro | `Guitar` |
| **Entity (TypeORM)** | Mapeo de tabla de BD | `GuitarTypeOrmEntity` |
| **Puerto** | Interfaz que define un contrato | `GuitarRepositoryPort` |
| **Adaptador** | Implementación concreta de un puerto | `GuitarTypeOrmRepository` |


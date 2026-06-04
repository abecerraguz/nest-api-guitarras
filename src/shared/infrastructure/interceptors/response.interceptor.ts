import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  status: 'success';
  code: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/** Envuelve respuestas exitosas en el formato estándar { status, code, message, data, meta? }.
 *  Si el handler ya retorna un objeto con la clave `status`, lo deja pasar sin modificar. */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const httpResponse = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: unknown) => {
        // Si el controller ya construyó la respuesta completa, pasarla tal cual
        if (
          data !== null &&
          typeof data === 'object' &&
          'status' in (data as object)
        ) {
          return data as ApiSuccessResponse<T>;
        }

        return {
          status: 'success' as const,
          code: httpResponse.statusCode as number,
          message: 'Operación completada exitosamente',
          data: data as T,
        };
      }),
    );
  }
}

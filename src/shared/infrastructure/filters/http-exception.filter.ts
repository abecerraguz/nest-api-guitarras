import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from '../../domain/exceptions/api.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        message =
          Array.isArray(bodyObj['message'])
            ? 'Error de validación'
            : (bodyObj['message'] as string) ?? exception.message;
        details = Array.isArray(bodyObj['message'])
          ? (bodyObj['message'] as unknown[])
          : undefined;
      }
    } else if (exception instanceof ApiException) {
      statusCode = exception.statusCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(statusCode).json({
      status: 'error',
      code: statusCode,
      message,
      ...(details?.length ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

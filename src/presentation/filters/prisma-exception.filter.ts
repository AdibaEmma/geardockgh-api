import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

interface PrismaErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, code } =
      this.mapPrismaError(exception);

    this.logger.warn(
      `Prisma error [${exception.code}]: ${exception.message}`,
    );

    const errorResponse: PrismaErrorResponse = {
      success: false,
      error: {
        code,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(statusCode).json(errorResponse);
  }

  private mapPrismaError(exception: PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    code: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[]) ?? [];
        const fields = target.join(', ');
        return {
          statusCode: HttpStatus.CONFLICT,
          message: fields
            ? `A record with this ${fields} already exists`
            : 'A record with these unique fields already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        };
      }

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message:
            (exception.meta?.cause as string) ??
            'The requested record was not found',
          code: 'RECORD_NOT_FOUND',
        };

      case 'P2003': {
        const field = (exception.meta?.field_name as string) ?? 'unknown';
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid reference: the related record for '${field}' does not exist`,
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        };
      }

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected database error occurred',
          code: `PRISMA_${exception.code}`,
        };
    }
  }
}

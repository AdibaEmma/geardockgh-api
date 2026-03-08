import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          'meta' in response
        ) {
          const paginatedResponse = response as unknown as {
            data: T;
            meta: Record<string, unknown>;
          };
          return {
            success: true as const,
            data: paginatedResponse.data,
            meta: paginatedResponse.meta,
          };
        }

        return {
          success: true as const,
          data: response,
        };
      }),
    );
  }
}

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

export function ApiPaginatedResponse(model: Type) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 20)',
      example: 20,
    }),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 5 },
                },
              },
            },
          },
        ],
      },
    }),
  );
}

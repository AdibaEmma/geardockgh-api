import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { AppConfiguration } from '../config/app.config.js';

const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  'Customer',
  'Product',
  'Order',
  'Preorder',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const appConf = configService.get<AppConfiguration>('app')!;
    const adapter = new PrismaPg({ connectionString: appConf.database.url });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  withSoftDelete() {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }: any) {
            if (model && SOFT_DELETE_MODELS.has(model)) {
              args.where = addDeletedAtFilter(args.where);
            }
            return query(args);
          },
          async findFirst({ model, args, query }: any) {
            if (model && SOFT_DELETE_MODELS.has(model)) {
              args.where = addDeletedAtFilter(args.where);
            }
            return query(args);
          },
          async findUnique({ model, args, query }: any) {
            if (model && SOFT_DELETE_MODELS.has(model)) {
              args.where = addDeletedAtFilter(args.where);
            }
            return query(args);
          },
          async count({ model, args, query }: any) {
            if (model && SOFT_DELETE_MODELS.has(model)) {
              args.where = addDeletedAtFilter(args.where);
            }
            return query(args);
          },
        },
      },
    });
  }

  async softDelete(
    model: string,
    where: Record<string, unknown>,
  ): Promise<unknown> {
    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (this as any)[modelKey];
    return delegate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteMany(
    model: string,
    where: Record<string, unknown>,
  ): Promise<unknown> {
    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (this as any)[modelKey];
    return delegate.updateMany({
      where,
      data: { deletedAt: new Date() },
    });
  }
}

function addDeletedAtFilter(
  where: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!where) {
    return { deletedAt: null };
  }
  if (where.deletedAt === undefined) {
    return { ...where, deletedAt: null };
  }
  return where;
}

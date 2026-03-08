import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter.js';
import { PrismaExceptionFilter } from './presentation/filters/prisma-exception.filter.js';
import { TransformInterceptor } from './presentation/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './presentation/interceptors/logging.interceptor.js';
import type { AppConfiguration } from './infrastructure/config/app.config.js';

async function bootstrap() {
  console.log('Starting GearDockGH API...');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfiguration>('app')!;

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: appConfig.corsOrigins.length > 0
      ? appConfig.corsOrigins
      : appConfig.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Key'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GearDockGH API')
    .setDescription('E-commerce API for GearDockGH — premium gear for Ghana')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = appConfig.port;
  await app.listen(port);
  logger.log(`GearDockGH API running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start GearDockGH API:', err);
  process.exit(1);
});

import { registerAs } from '@nestjs/config';

export interface AppConfiguration {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  corsOrigins: string[];
  defaultTenantId: string;

  jwt: {
    secret: string;
    refreshSecret: string;
    expiry: string;
    refreshExpiry: string;
  };

  database: {
    url: string;
  };

  paystack: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
  };

  geardockghApiUrl: string;

  importbrain: {
    apiUrl: string;
    platformKey: string;
  };

  redis: {
    url: string;
  };

  arkesel: {
    apiKey: string;
    senderId: string;
  };

  resend: {
    apiKey: string;
  };

  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

export const appConfig = registerAs('app', (): AppConfiguration => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const corsOriginsRaw = process.env.CORS_ORIGINS ?? '';
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: parseInt(process.env.PORT ?? '8001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    defaultTenantId: process.env.DEFAULT_TENANT_ID ?? 'default',
    corsOrigins,
    geardockghApiUrl: process.env.GEARDOCKGH_API_URL ?? 'http://localhost:8001/api',

    jwt: {
      secret: process.env.JWT_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      expiry: process.env.JWT_EXPIRY ?? '15m',
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    },

    database: {
      url: process.env.DATABASE_URL!,
    },

    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',
    },

    importbrain: {
      apiUrl: process.env.IMPORTBRAIN_API_URL ?? 'http://localhost:8000/api',
      platformKey: process.env.IMPORTBRAIN_PLATFORM_KEY ?? '',
    },

    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },

    arkesel: {
      apiKey: process.env.ARKESEL_API_KEY ?? '',
      senderId: process.env.ARKESEL_SENDER_ID ?? 'GearDockGH',
    },

    resend: {
      apiKey: process.env.RESEND_API_KEY ?? '',
    },

    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
  };
});

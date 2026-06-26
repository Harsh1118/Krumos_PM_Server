import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import { NodeEnvEnum } from '../../types/enum';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum([NodeEnvEnum.LOCAL, NodeEnvEnum.DEV, NodeEnvEnum.STAGING, NodeEnvEnum.PROD]),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRY: z.string().default('24h'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  FRONTEND_URL: z.string(),
  BREVO_API_KEY: z.string(),
  BREVO_FROM_EMAIL: z.string().email(),
  BREVO_FROM_NAME: z.string().default('Krumos'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

type EnvType = z.infer<typeof envSchema>;

@Injectable()
export class EnvConfig {
  private readonly envConfig: EnvType;

  constructor() {
    // Validate environment variables
    const parsedEnv = envSchema.safeParse(process.env);

    if (!parsedEnv.success) {
      console.error('Invalid environment variables:', parsedEnv.error.format());
      throw new Error('Invalid environment variables');
    }

    this.envConfig = parsedEnv.data;
  }

  get appConfig() {
    const { NODE_ENV, PORT, FRONTEND_URL } = this.envConfig;
    return {
      nodeEnv: NODE_ENV,
      port: parseInt(PORT, 10),
      isLocal: NODE_ENV === NodeEnvEnum.LOCAL,
      isProduction: NODE_ENV === NodeEnvEnum.PROD,
      isDevelopment: NODE_ENV === NodeEnvEnum.DEV,
      isStaging: NODE_ENV === NodeEnvEnum.STAGING,
      frontendUrl: FRONTEND_URL,
    };
  }

  get dbConfig() {
    const { DATABASE_URL } = this.envConfig;
    return {
      url: DATABASE_URL,
    };
  }

  get jwtConfig() {
    const { JWT_SECRET, JWT_EXPIRY } = this.envConfig;
    return {
      secret: JWT_SECRET,
      expiry: JWT_EXPIRY,
    };
  }

  get googleOauthConfig() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = this.envConfig;
    return {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI,
    };
  }

  get emailConfig() {
    const { BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME } = this.envConfig;
    return {
      apiKey: BREVO_API_KEY,
      fromEmail: BREVO_FROM_EMAIL,
      fromName: BREVO_FROM_NAME,
    };
  }

  get redisConfig() {
    const { REDIS_URL } = this.envConfig;
    return {
      url: REDIS_URL,
    };
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './core/filters/exception/global-exception.filter';
import { RedisIoAdapter } from './core/events/redis-io.adapter';
import { types } from 'pg';

// Force pg to parse TIMESTAMP (without timezone, OID 1114) as UTC
types.setTypeParser(1114, (stringValue) => {
  return new Date(stringValue + 'Z');
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Configure Redis Adapter for horizontal WebSocket scaling
  try {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log('WebSocket Redis adapter configured successfully');
  } catch (err) {
    logger.error(
      'Failed to configure WebSocket Redis adapter',
      (err as Error).stack,
    );
  }

  // Enable CORS with restricted origin whitelisting
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl.includes(',') ? frontendUrl.split(',') : frontendUrl,
    credentials: true,
  });

  // Integrate helmet for secure HTTP response headers
  app.use(helmet());

  // Enable cookie parsing middleware
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Set up global exception filter to avoid leaking server errors
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Set up global request validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`Krumos PM Backend running on: http://localhost:${port}/api`);
}
void bootstrap();

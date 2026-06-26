import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log detailed trace internally
    this.logger.error(
      `Exception thrown: ${exception instanceof Error ? exception.stack : exception}`,
    );

    // Format final message to avoid leaking internals
    const formattedMessage =
      typeof message === 'object' && message !== null
        ? (message as Record<string, string>).message || message
        : message;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: formattedMessage,
    });
  }
}

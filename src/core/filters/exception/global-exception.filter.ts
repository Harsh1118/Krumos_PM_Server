import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Resolve HTTP status code
    let status: number;
    let userMessage: string | object;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      userMessage = 'Too many requests. Please slow down and try again later.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      // Extract the message field if present, otherwise use the whole response
      if (typeof res === 'object' && res !== null) {
        userMessage = (res as Record<string, unknown>).message ?? res;
      } else {
        userMessage = res as string;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      // Never expose internal error details to clients
      userMessage = 'An unexpected error occurred. Please try again later.';
    }

    // Structured internal logging — full stack trace for 5xx, warn for 4xx
    const logContext = `${request.method} ${request.path}`;
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${status}] ${logContext} → ${stack}`);
    } else if (status >= 400 && status !== 404) {
      // Log 4xx (except 404s which are too noisy) as warnings
      const msg = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`[${status}] ${logContext} → ${msg}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      message: userMessage,
    });
  }
}

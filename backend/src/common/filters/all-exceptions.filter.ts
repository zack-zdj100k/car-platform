import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  path: string;
  timestamp: string;
}

/**
 * Single source of truth for error responses (spec §57, §72).
 *
 * Internal details — stack traces, Prisma messages, SQL — are logged but never
 * returned to the client (spec §67 "safe error handling").
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();

    const body = this.buildBody(exception, request.url);

    // Compared as a plain number: statusCode is a number, not an HttpStatus member.
    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${body.statusCode}: ${String(body.message)}`);
    }

    httpAdapter.reply(context.getResponse(), body, body.statusCode);
  }

  private buildBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message,
        path,
        timestamp,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { ...this.mapPrismaError(exception), path, timestamp };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'BAD_REQUEST',
        message: 'The submitted data does not match the expected format.',
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      path,
      timestamp,
    };
  }

  /** Translates Prisma error codes into safe, user-facing HTTP responses. */
  private mapPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): Omit<ErrorBody, 'path' | 'timestamp'> {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'CONFLICT',
          message: 'That record already exists.',
          code: exception.code,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'BAD_REQUEST',
          message: 'A referenced record does not exist.',
          code: exception.code,
        };
      case 'P2014':
      case 'P2003_RESTRICT':
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'CONFLICT',
          message: 'This record is referenced by other data and cannot be removed.',
          code: exception.code,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'NOT_FOUND',
          message: 'The requested record was not found.',
          code: exception.code,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected database error occurred.',
          code: exception.code,
        };
    }
  }
}

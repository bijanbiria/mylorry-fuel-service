import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * HttpExceptionEnvelopeFilter
 * - Ensures errors are returned as { data: null, message, error: { code, details? } }
 * - Works together with ApiEnvelopeInterceptor to enforce the envelope everywhere.
 */
@Catch()
export class HttpExceptionEnvelopeFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse() as any;
      const message =
        (typeof resp === 'object' && (resp.message || resp.error)) ||
        exception.message ||
        'Error';
      const code =
        (typeof resp === 'object' && (resp.code || resp.error)) ||
        exception.name ||
        'HTTP_EXCEPTION';

      return res.status(status).json({
        data: null,
        message,
        error: { code, details: typeof resp === 'object' ? resp : undefined },
      });
    }

    // Unknown / non-HTTP errors -> 500
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      message: 'Unexpected error',
      error: { code: 'INTERNAL_ERROR' },
    });
  }
}
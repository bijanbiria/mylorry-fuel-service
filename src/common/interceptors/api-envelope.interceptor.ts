import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * ApiEnvelopeInterceptor
 * - Wraps every successful response as { data, message, error }.
 * - If body already matches { data, message, error }, it passes through.
 * - If body is a domain union (like { kind: 'APPROVED' | 'REJECTED' | ... }),
 *   it maps to envelope AND sets HTTP status code accordingly.
 */
@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const res = ctx.switchToHttp().getResponse();

    return next.handle().pipe(
      map((body) => {
        // 1) Skip if already an envelope
        if (
          body &&
          typeof body === 'object' &&
          'data' in body &&
          'message' in body &&
          'error' in body
        ) {
          return body;
        }

        // 2) Map known ProcessResult union (from WebhooksService)
        if (body && typeof body === 'object' && 'kind' in body) {
          const out = body as
            | { kind: 'DUPLICATE' }
            | { kind: 'BAD_REQUEST'; code: string; message: string }
            | { kind: 'REJECTED'; code: string; message: string }
            | { kind: 'APPROVED'; txId: string };

          switch (out.kind) {
            case 'DUPLICATE':
              res.status(409);
              return { data: null, message: 'Duplicate webhook (idempotency key)', error: { code: 'DUPLICATE' } };
            case 'BAD_REQUEST':
              res.status(400);
              return { data: null, message: out.message, error: { code: out.code } };
            case 'REJECTED':
              res.status(422);
              return { data: null, message: out.message, error: { code: out.code } };
            case 'APPROVED':
              res.status(200);
              return { data: { status: 'approved', transactionId: out.txId }, message: 'Approved', error: null };
          }
        }

        // 3) Default success wrapping
        return { data: body ?? null, message: null, error: null };
      }),
    );
  }
}
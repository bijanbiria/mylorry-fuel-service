import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { IncomingTransactionDto } from '../dto/incoming-transaction.dto';
import { WebhooksService } from '../services/webhooks.service';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { TransactionEnvelopeDto } from '../../transactions/dto/transaction-envelope.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) { }

  /**
   * Always returns { data, message, error } with proper HTTP code:
   * 200 OK (approved) | 409 Conflict (duplicate) | 422 Unprocessable (rules) | 400 Bad Request (invalid inputs)
   */
  @Post('transactions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process incoming fuel transaction' })
  @ApiHeader({ name: 'x-idempotency-key', required: false })
    @ApiOkResponse({
    description: 'Approved',
    schema: {
      example: {
        data: { status: 'approved', transactionId: 'd3c1f9b6-2f2a-42a9-9f0f-1f91a6f7465d' },
        message: 'Approved',
        error: null,
      },
    },
  })
  @ApiConflictResponse({
    description: 'Duplicate webhook (idempotency key)',
    schema: {
      example: {
        data: null,
        message: 'Duplicate webhook (idempotency key)',
        error: { code: 'DUPLICATE' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Business rule validation failed',
    schema: {
      examples: {
        DAILY: {
          summary: 'Daily limit exceeded',
          value: {
            data: null,
            message: 'Daily limit exceeded',
            error: { code: 'DAILY_LIMIT_EXCEEDED' },
          },
        },
        MONTHLY: {
          summary: 'Monthly limit exceeded',
          value: {
            data: null,
            message: 'Monthly limit exceeded',
            error: { code: 'MONTHLY_LIMIT_EXCEEDED' },
          },
        },
        FUNDS: {
          summary: 'Insufficient funds',
          value: {
            data: null,
            message: 'Insufficient organization balance',
            error: { code: 'INSUFFICIENT_FUNDS' },
          },
        },
        BLOCKED: {
          summary: 'Card blocked',
          value: {
            data: null,
            message: 'Card is blocked',
            error: { code: 'CARD_BLOCKED' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid station/card/currency',
    schema: {
      examples: {
        CARD: {
          summary: 'Card not found',
          value: {
            data: null,
            message: 'Card not found',
            error: { code: 'CARD_NOT_FOUND' },
          },
        },
        ORG: {
          summary: 'Organization not found',
          value: {
            data: null,
            message: 'Organization not found',
            error: { code: 'ORG_NOT_FOUND' },
          },
        },
        CUR: {
          summary: 'Currency mismatch',
          value: {
            data: null,
            message: 'Currency mismatch',
            error: { code: 'CURRENCY_MISMATCH' },
          },
        },
      },
    },
  })
  async handleTx(
    @Body() dto: IncomingTransactionDto,
    @Headers('x-idempotency-key') idemKey: string | undefined,
  ) {
    // Let the global interceptor map the union to {data,message,error} + HTTP status
    return this.svc.processIncoming(dto, idemKey);
  }
}
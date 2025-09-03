import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { IncomingTransactionDto } from '../dto/incoming-transaction.dto';
import { WebhooksService } from '../services/webhooks.service';
import { ApiTags, ApiOperation, ApiHeader, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { TransactionResponseDto } from '../../transactions/dto/transaction-response.dto';

/**
 * WebhooksController
 *
 * Ingests provider webhooks. Currently supports fuel transactions via
 * POST /webhooks/transactions under the global prefix (e.g., /api/v1/... ).
 * - Idempotency: accepts optional 'x-idempotency-key' header to deduplicate.
 * - Validation: body validated by IncomingTransactionDto.
 * - Response: TransactionResponseDto with processing outcome.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  /**
   * Process an incoming fuel transaction webhook.
   * @param dto Parsed and validated transaction payload.
   * @param idemKey Optional idempotency key for deduplication.
   */
  @Post('transactions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process incoming fuel transaction' })
  @ApiHeader({ name: 'x-idempotency-key', required: false })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async handleTx(
    @Body() dto: IncomingTransactionDto,
    @Headers('x-idempotency-key') idemKey?: string,
  ) {
    return this.svc.processIncoming(dto, idemKey);
  }
}

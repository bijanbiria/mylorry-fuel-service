import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { IncomingTransactionDto } from '../dto/incoming-transaction.dto';
import { WebhooksService } from '../services/webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  @Post('transactions')
  @HttpCode(200)
  async handleTx(
    @Body() dto: IncomingTransactionDto,
    @Headers('x-idempotency-key') idemKey?: string,
  ) {
    return this.svc.processIncoming(dto, idemKey);
  }
}
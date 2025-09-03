import { Module } from '@nestjs/common';
import { WebhooksController } from './controllers/webhooks.controller';
import { WebhooksService } from './services/webhooks.service';
import { TransactionsModule } from '../transactions/transactions.module';

/**
 * WebhooksModule
 *
 * Handles inbound webhook ingestion and processing. Depends on
 * TransactionsModule for creating/persisting transactions from events.
 */
@Module({
  imports: [TransactionsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

import { Module } from '@nestjs/common';
import { TransactionsService } from './services/transactions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrgAccount } from '../organizations/entities/org-account.entity';
import { CardLimitRule } from '../usage/entities/card-limit-rule.entity';
import { CardUsageBucket } from '../usage/entities/card-usage-bucket.entity';
import { FuelTransaction } from './entities/fuel-transaction.entity';

/**
 * TransactionsModule
 *
 * Provides transaction-related services and repositories. Registers required
 * entities via TypeOrmModule.forFeature for injection into services.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      Organization,
      OrgAccount,
      CardLimitRule,
      CardUsageBucket,
      FuelTransaction,
    ]),
  ],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

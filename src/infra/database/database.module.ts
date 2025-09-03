// src/infra/database/database.module.ts
/**
 * DatabaseModule
 *
 * Configures TypeORM for the Nest runtime. Prefer explicit entities for
 * predictable schemas; you can switch to `autoLoadEntities` if desired.
 * Runtime options differ from CLI options (no migrations here).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnv, buildRuntimeOptions } from '../../config/database.config';

// Use explicit entities (as configured here) for predictable schemas:
import { Card } from '../../modules/cards/entities/card.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrgAccount } from '../../modules/organizations/entities/org-account.entity';
import { Station } from '../../modules/stations/entities/station.entity';
import { FuelTransaction } from '../../modules/transactions/entities/fuel-transaction.entity';
import { CardLimitRule } from '../../modules/usage/entities/card-limit-rule.entity';
import { CardUsageBucket } from '../../modules/usage/entities/card-usage-bucket.entity';
import { WebhookEvent } from '../../modules/webhooks/entities/webhook-event.entity';

const runtimeEntities = [
  Card, Organization, OrgAccount, Station,
  FuelTransaction, CardLimitRule, CardUsageBucket, WebhookEvent,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        loadEnv();
        return {
          ...buildRuntimeOptions(runtimeEntities),
          // Alternatively, enable autoLoadEntities instead of listing entities:
          // autoLoadEntities: true,
          // entities: [],
        };
      },
    }),
  ],
})
export class DatabaseModule {}

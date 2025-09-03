import 'dotenv/config';
import dataSource from '../infra/database/data-source';
import type { DataSource } from 'typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { OrgAccount } from '../modules/organizations/entities/org-account.entity';
import { Card } from '../modules/cards/entities/card.entity';
import { CardLimitRule } from '../modules/usage/entities/card-limit-rule.entity';
import { Station } from '../modules/stations/entities/station.entity';

/**
 * Seeds the database with a small coherent dataset.
 * Exported as default function so runners (run-seed.ts) can call it.
 */
export default async function seed(ds?: DataSource): Promise<void> {
  const dsInstance = ds ?? dataSource;
  let initializedHere = false;

  if (!dsInstance.isInitialized) {
    await dsInstance.initialize();
    initializedHere = true;
  }

  const em = dsInstance.manager;

  // Organization
  const org = em.create(Organization, { name: 'Acme Co', currency: 'USD' });
  await em.save(org);

  // Org account — bigint-safe as string
  const acc = em.create(OrgAccount, { organizationId: org.id, availableCents: '5000000' }); // $50,000.00
  await em.save(acc);

  // Card
  const card = em.create(Card, {
    organizationId: org.id,
    cardNumberHash: 'sha256:demo-hash',
    last4: '4242',
    status: 'active',
  });
  await em.save(card);

  // Station
  await em.save(Station, { code: 'STN-001', name: 'Fuel Station #1' });

  // Card daily limit rule
  await em.save(CardLimitRule, {
    cardId: card.id,
    periodType: 'DAILY',
    limitCents: '200000', // $2,000.00
    windowMode: 'CALENDAR',
  });

  if (initializedHere) {
    await dsInstance.destroy();
  }
}
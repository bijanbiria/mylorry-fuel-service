import 'dotenv/config';
import dataSource from '../infra/database/data-source';
import type { DataSource } from 'typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { OrgAccount } from '../modules/organizations/entities/org-account.entity';
import { Card } from '../modules/cards/entities/card.entity';
import { CardLimitRule } from '../modules/usage/entities/card-limit-rule.entity';
import { Station } from '../modules/stations/entities/station.entity';
import { loadEnv } from 'src/config/database.config';

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
  const org1 = em.create(Organization, { name: 'Acme Co', currency: 'USD' });
  await em.save(org1);

  const org2 = em.create(Organization, { name: 'Globex Inc', currency: 'EUR' });
  await em.save(org2);

  const org3 = em.create(Organization, { name: 'Initech Ltd', currency: 'GBP' });
  await em.save(org3);


  // Org account — bigint-safe as string
  const acc = em.create(OrgAccount, [
    { organizationId: org1.id, availableCents: '5000000' }, // $50,000.00
    { organizationId: org2.id, availableCents: '6000000' }, // $60,000.00
    { organizationId: org3.id, availableCents: '7000000' }, // $70,000.00
  ]);
  await em.save(acc);


  // Card
  const card1 = em.create(Card, 
    {
      organizationId: org1.id,
      cardNumberHash: 'sha256:demo-hash',
      last4: '4242',
      status: 'active',
    }
  );
  await em.save(card1);

  const card2 = em.create(Card, 
    {
      organizationId: org2.id,
      cardNumberHash: 'sha256:demo-hash',
      last4: '2234',
      status: 'active',
    }
  );
  await em.save(card2);

  const card3 = em.create(Card, 
    {
      organizationId: org3.id,
      cardNumberHash: 'sha256:demo-hash',
      last4: '5465',
      status: 'blocked',
    }
  );
  await em.save(card3);


  // Station
  await em.save(Station, [
    { code: 'STN-001', name: 'Fuel Station #1' }, 
    { code: 'STN-002', name: 'Fuel Station #2' }, 
    { code: 'STN-003', name: 'Fuel Station #3' }
  ]);


  // Card daily limit rule
  await em.save(CardLimitRule, {
    cardId: card1.id,
    periodType: 'DAILY',
    limitCents: '200000', // $2,000.00
    windowMode: 'CALENDAR',
  });
  await em.save(CardLimitRule, {
    cardId: card2.id,
    periodType: 'WEEKLY',
    limitCents: '1400000', // $14,000.00
    windowMode: 'CALENDAR',
  });
  await em.save(CardLimitRule, {
    cardId: card3.id,
    periodType: 'MONTHLY',
    limitCents: '6000000', // $60,000.00
    windowMode: 'CALENDAR',
  });

  if (initializedHere) {
    await dsInstance.destroy();
  }
}
seed();
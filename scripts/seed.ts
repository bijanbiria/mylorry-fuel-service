import dataSource from '../src/infra/database/data-source';
import { Organization } from '../src/modules/organizations/entities/organization.entity';
import { OrgAccount } from '../src/modules/organizations/entities/org-account.entity';
import { Card } from '../src/modules/cards/entities/card.entity';
import { CardLimitRule } from '../src/modules/usage/entities/card-limit-rule.entity';
import { Station } from '../src/modules/stations/entities/station.entity';
import { randomUUID } from 'crypto';

(async () => {
  await dataSource.initialize();
  const em = dataSource.manager;

  const org = em.create(Organization, { name: 'Acme Co', currency: 'USD' });
  await em.save(org);

  const acc = em.create(OrgAccount, { organizationId: org.id, availableCents: '5000000' }); // $50,000.00
  await em.save(acc);

  const card = em.create(Card, {
    organizationId: org.id,
    cardNumberHash: 'sha256:demo-hash',
    last4: '4242',
    status: 'active',
  });
  await em.save(card);

  await em.save(Station, { code: 'STN-001', name: 'Fuel Station #1' });

  await em.save(CardLimitRule, {
    cardId: card.id, periodType: 'DAILY', limitCents: '200000', windowMode: 'CALENDAR', // $2,000/day
  });

  console.log('Seed done ✅');
  await dataSource.destroy();
})().catch(e => { console.error(e); process.exit(1); });
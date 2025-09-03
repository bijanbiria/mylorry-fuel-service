import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { WebhooksController } from '../src/modules/webhooks/controllers/webhooks.controller';
import { WebhooksService } from '../src/modules/webhooks/services/webhooks.service';

describe('WebhooksController (e2e)', () => {
  let app: INestApplication;

  const stubResponse = { status: 'approved', transactionId: 'test-tx-123' };
  const mockedService = {
    processIncoming: jest.fn().mockResolvedValue(stubResponse),
  } as unknown as WebhooksService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockedService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/webhooks/transactions should process a transaction', async () => {
    const payload = {
      stationCode: 'STN-001',
      cardNumber: '4242424242424242',
      amountCents: '1000',
      currency: 'USD',
      occurredAt: new Date().toISOString(),
      externalRef: 'RRN-123',
    };

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/transactions')
      .set('x-idempotency-key', 'abc-123')
      .send(payload)
      .expect(200)
      .expect(stubResponse);

    expect(mockedService.processIncoming).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      'abc-123',
    );
  });
});

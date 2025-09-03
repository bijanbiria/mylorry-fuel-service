/**
 * Unit tests for AppController
 *
 * Verifies the root handler delegates to AppService and returns the expected
 * message. Keeps the test lightweight and focused on controller behavior.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the fun root message', () => {
      expect(appController.getHello()).toBe(
        '👀 Hey there, curious explorer! This is the MyLorry Fuel Service API. Nothing to see here on the root – check the docs instead 😉'
      );
    });
  });
});

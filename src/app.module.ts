import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infra/database/database.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CacheModule } from './common/cache/cache.module';

/**
 * AppModule
 *
 * Composition root for the application. Loads global configuration, database
 * connectivity, and feature modules. Keep cross-cutting providers here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: 'REDIS',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('REDIS_HOST');
        const port = Number(cfg.get<string>('REDIS_PORT') ?? 6379);
        const db   = Number(cfg.get<string>('REDIS_DB') ?? 0);
        const url  = cfg.get<string>('REDIS_URL');

        if (!url && !host) return undefined; // no redis configured -> no-op

        const baseOpts = {
            lazyConnect: false,
            // ioredis options to avoid long hangs:
            maxRetriesPerRequest: 2,
            enableOfflineQueue: false,
            connectTimeout: 5000,
            retryStrategy: () => null, // don't keep retrying forever
        } as const;

        const client = url
            ? new Redis(url, baseOpts as any)
            : new Redis({ host, port, db, ...(baseOpts as any) });

        client.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.warn('[redis] connection error:', String(err));
        });
        client.on('connect', () => console.info('[redis] connected'));
        client.on('end', () => console.info('[redis] disconnected'));

        return client;
      },
    },
    CacheService,
  ],
  exports: ['REDIS', CacheService],
})
export class CacheModule {}
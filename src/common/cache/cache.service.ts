import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private readonly log = new Logger(CacheService.name);
  constructor(@Optional() @Inject('REDIS') private readonly redis?: Redis) {}

  get isEnabled(): boolean {
    return !!this.redis;
  }

    private async safe<T>(op: () => Promise<T>): Promise<T | null> {
      if (!this.redis) return null;
      try {
        return await op();
      } catch (err) {
        this.log.warn(`Redis op failed: ${String(err)}`);
        return null;
      }
    }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.safe(() => this.redis!.get(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      this.log.warn(`Failed to JSON.parse for key=${key}: ${String(e)}`);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSec = 300): Promise<void> {
    await this.safe(() => this.redis!.set(key, JSON.stringify(value), 'EX', ttlSec).then(() => null));
  }

  async del(key: string): Promise<void> {
    await this.safe(() => this.redis!.del(key).then(() => null));
  }

  /**
   * Read-through cache helper:
   * - Tries cache; if miss, calls `loader()`, caches result (if truthy), and returns it.
   */
  async getOrSetJson<T>(key: string, loader: () => Promise<T>, ttlSec = 300): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    if (fresh !== null && fresh !== undefined) {
      await this.setJson(key, fresh as any, ttlSec);
    }
    return fresh;
  }
}
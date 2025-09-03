import { Injectable } from '@nestjs/common';

/**
 * AppService
 *
 * Lightweight application-level service used by the root controller. Keep
 * shared, trivial logic here (e.g., liveness/health text) rather than in
 * controllers to ease testing and future extension.
 */
@Injectable()
export class AppService {
  /**
   * Message returned by GET / (see AppController). Update this text to
   * guide developers/users to docs or status endpoints.
   */
  getHomeMessage(): string {
    return '👀 Hey there, curious explorer! This is the MyLorry Fuel Service API. Nothing to see here on the root – check the docs instead 😉';
  }
}

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * AppController
 *
 * Handles the root route GET / (under the global prefix). Useful for
 * smoke-checking the app is running. Keep this minimal and avoid adding
 * app logic here; delegate to services.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET / — returns a friendly message. Consider redirecting to docs or
   * exposing a health endpoint separately if needed.
   */
  @Get()
  getHello(): string {
    return this.appService.getHomeMessage();
  }
}

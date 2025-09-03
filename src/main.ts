/**
 * Application bootstrap.
 *
 * - Global route prefix: 'api/v1' so all controller routes live under
 *   /api/v1/... . If you need true API versioning, consider Nest's
 *   `app.enableVersioning(...)` and move 'v1' into versioning instead of a
 *   static prefix.
 *
 * - Port: reads PORT from environment (defaults to 3000).
 *
 * Quick tips:
 * - Enable CORS for browser clients: `app.enableCors()`.
 * - Add global pipes/filters/interceptors here (e.g., ValidationPipe).
 * - Keep startup light; heavy sync work before `listen()` delays readiness.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Base path for all HTTP routes (e.g., GET /api/v1/health)
  app.setGlobalPrefix('api/v1');
  // Start HTTP server using env PORT or fallback to 3000
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

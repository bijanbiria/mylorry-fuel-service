/**
 * Application bootstrap.
 *
 * - Global route prefix: 'api/v1' so all controller routes live under
 *   /api/v1/... . For true API versioning, consider `app.enableVersioning()`.
 * - OpenAPI: serves JSON at /openapi.json and Scalar UI at /docs.
 * - Port: reads PORT from environment (defaults to 3000).
 *
 * Quick tips:
 * - Enable CORS for browser clients: `app.enableCors()`.
 * - Add global pipes/filters/interceptors here (e.g., ValidationPipe).
 * - Keep startup light; heavy sync work before `listen()` delays readiness.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as fs from 'fs';
import * as path from 'path';
import { ApiEnvelopeInterceptor } from './common/interceptors/api-envelope.interceptor';
import { HttpExceptionEnvelopeFilter } from './common/filters/http-exception-envelope.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global interceptors/filters/pipes
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  // Global filter to ensure all errors are in the envelope format
  app.useGlobalFilters(new HttpExceptionEnvelopeFilter());
  // Base path for all HTTP routes (e.g., GET /api/v1/health)
  app.setGlobalPrefix('api/v1');

  // --- Build OpenAPI document ---
  const config = new DocumentBuilder()
    .setTitle('MyLorry Fuel Service API')
    .setDescription('Webhook + transactions processing for fuel cards')
    .setVersion('1.0.0')
    .addTag('webhooks')
    // If you add auth later, enable bearer auth in the spec
    // .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve JSON
  app.getHttpAdapter().get('/openapi.json', (req, res) => {
    res.type('application/json').send(document);
  });

  // Optional: also write the JSON file to disk (useful for CI/CD artifacts)
  const out = path.resolve(process.cwd(), 'openapi.json');
  fs.writeFileSync(out, JSON.stringify(document, null, 2));

  // --- Scalar UI at /docs ---
  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: 'default', // alternatives: 'purple', 'saturn', ...
      layout: 'modern', // alternatives: 'classic'
      metaData: {
        title: 'MyLorry Fuel Service API',
        description: 'OpenAPI reference powered by Scalar',
      },
    }),
  );

  // Start HTTP server using env PORT or fallback to 3000
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

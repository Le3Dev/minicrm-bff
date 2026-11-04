import { NestFactory } from '@nestjs/core';
import { configurarSwagger } from './api/swagger';
import { AppModule } from './app.module';
import { lerConfiguracao } from './infrastructure/configuracao';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = lerConfiguracao();
  app.enableCors({
    origin: config.corsOrigens,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-api-key'],
  });
  configurarSwagger(app);
  await app.listen(config.port, '0.0.0.0');
}
void bootstrap();

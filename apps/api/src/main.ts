import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ALLOWED_ORIGINS, PORT } from './infrastructure/config/config-keys';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const allowedOrigins = config.get<string>(ALLOWED_ORIGINS) ?? '*';

  app.enableCors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(','),
    methods: 'GET,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(config.getOrThrow<number>(PORT));
}

void bootstrap();

import { config } from 'dotenv';
config(); // <-- must come first

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.HOST,
      port: parseInt(process.env.PORT || '5000'), // Schedule Service port
    },
  });

  await app.startAllMicroservices();
  Logger.log(`Schedule Service running on port ${process.env.PORT}`); // Now it works
}
bootstrap();

import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Connect microservice
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.HOST,
      port: parseInt(process.env.PORT || '5000'),
    },
  });

  // Use Pino logger globally
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  logger.log(`Schedule Service running on port ${process.env.PORT}`);
}

bootstrap();
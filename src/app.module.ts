import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SchedulerService } from './app.service';
import { SchedulerController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import * as path from 'path';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    ClientsModule.register([
      {
        name: 'QUEUE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.QUEUE_SERVICE_HOST,
          port: parseInt(process.env.QUEUE_SERVICE_PORT || '4000'),
        },
      },
    ]),

    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
        transport: {
          targets: [
            { target: 'pino-pretty', options: { colorize: true } },
            {
              target: 'pino/file',
              options: {
                destination: path.join(__dirname, '..', '..', 'logs', 'scheduler-service.log'),
                mkdir: true,
              },
            },
          ],
        },
      },
    }),
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SchedulerService } from './app.service';
import { SchedulerController } from './app.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'QUEUE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.QUEUE_SERVICE_HOST, // Queue Service host
          port: parseInt(process.env.QUEUE_SERVICE_PORT || '4000'),        // Queue Service port
        },
      },
    ]),
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class AppModule {}

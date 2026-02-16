import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuid } from 'uuid';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject('QUEUE_SERVICE') private readonly queueClient: ClientProxy,
  ) {}

  async scheduleTransaction(data: {
    userId: number;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAW';
    scheduleAt: string;
  }) {
    const transactionId = uuid();

    const delay =
      new Date(data.scheduleAt).getTime() - Date.now();

    this.logger.log(
      `Scheduling transaction ${transactionId} for user ${data.userId} in ${delay}ms`,
    );

    if (delay <= 0) {
      await this.sendToQueue(data, transactionId);
    } else {
      setTimeout(() => {
        this.sendToQueue(data, transactionId);
      }, delay);
    }

    return { status: 'SCHEDULED', transactionId };
  }

  private async sendToQueue(data: any, transactionId: string) {
    const payload = { ...data, transactionId };

    this.logger.log(
      `Sending scheduled transaction ${transactionId} to Queue Service`,
    );

    await firstValueFrom(
      this.queueClient.send('process_transaction', payload),
    );
  }
}

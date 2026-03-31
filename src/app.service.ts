import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { v4 as uuid } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { ScheduleTransactionDto } from './dto/schedule.dto';
import { Interval } from './enums/interval.enum';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class SchedulerService {
  constructor(
    @Inject('QUEUE_SERVICE') private readonly queueClient: ClientProxy,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SchedulerService.name);
  }

  async scheduleTransaction(data: ScheduleTransactionDto) {
    const transactionId = uuid();

    if (!data.scheduleAt) throw new BadRequestException('scheduleAt is required');

    if (data.frequency && data.interval) {
      return this.createRecurringJob(data, transactionId);
    }

    return this.createOneTimeJob(data, transactionId);
  }

  private createOneTimeJob(data: ScheduleTransactionDto, transactionId: string) {
    const executionDate = new Date(data.scheduleAt);
    if (executionDate.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule time must be in the future');
    }

    const job = new CronJob(executionDate, async () => {
      await this.sendToQueue(data, transactionId);
      job.stop();
      this.schedulerRegistry.deleteCronJob(transactionId);
      this.logger.info(`One-time job ${transactionId} executed`);
    });

    this.schedulerRegistry.addCronJob(transactionId, job);
    job.start();

    return {
      status: 'SCHEDULED_ONE_TIME',
      transactionId,
      executeAt: executionDate,
    };
  }

  private createRecurringJob(data: ScheduleTransactionDto, transactionId: string) {
    const { frequency, interval } = data;
    if (!frequency || !interval) throw new BadRequestException('Both interval and frequency required');

    const executionDate = new Date(data.scheduleAt);
    if (executionDate.getTime() <= Date.now()) throw new BadRequestException('Schedule time must be in the future');

    const cronExpression = this.convertIntervalToCron(interval);
    let executedCount = 0;

    const job = new CronJob(cronExpression, async () => {
      if (new Date() < executionDate) return;

      if (executedCount >= frequency) {
        job.stop();
        this.schedulerRegistry.deleteCronJob(transactionId);
        this.logger.info(`Recurring job ${transactionId} completed after ${executedCount} executions`);
        return;
      }

      await this.sendToQueue(data, transactionId);
      executedCount++;
    }, null, false);

    this.schedulerRegistry.addCronJob(transactionId, job);
    job.start();

    return {
      status: 'SCHEDULED_RECURRING',
      transactionId,
      interval,
      frequency,
      startAt: executionDate,
    };
  }

  private convertIntervalToCron(interval: { unit: Interval; value: number }): string {
    const { unit, value } = interval;
    switch (unit) {
      case Interval.SECOND: return `*/${value} * * * * *`;
      case Interval.MINUTE: return `0 */${value} * * * *`;
      case Interval.HOUR: return `0 0 */${value} * * *`;
      case Interval.DAY: return `0 0 0 */${value} * *`;
      default: throw new BadRequestException('Invalid interval unit');
    }
  }

  private async sendToQueue(data: ScheduleTransactionDto, transactionId: string) {
    const payload = { ...data, transactionId };
    this.logger.info(`Dispatching transaction ${transactionId}`);
    await firstValueFrom(this.queueClient.send('process_transaction', payload));
  }
}
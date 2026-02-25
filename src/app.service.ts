import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'; // ✅ REAL CRON
import { v4 as uuid } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { ScheduleTransactionDto } from './dto/schedule.dto';
import { Interval } from './enums/interval.enum';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject('QUEUE_SERVICE') private readonly queueClient: ClientProxy,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async scheduleTransaction(data: ScheduleTransactionDto) {
    const transactionId = uuid();

    if (!data.scheduleAt) {
      throw new BadRequestException('scheduleAt is required');
    }

    if (data.frequency && data.interval) {
      return this.createRecurringJob(data, transactionId);
    }

    return this.createOneTimeJob(data, transactionId);
  }

  // ======================================================
  // ONE-TIME EXECUTION USING CRON (Date-based CronJob)
  // ======================================================

  private createOneTimeJob(
    data: ScheduleTransactionDto,
    transactionId: string,
  ) {
    const executionDate = new Date(data.scheduleAt);

    if (executionDate.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule time must be in the future');
    }

    // ✅ CronJob can accept a Date object
    const job = new CronJob(executionDate, async () => {
      await this.sendToQueue(data, transactionId);

      // Stop and remove job after execution
      job.stop();
      this.schedulerRegistry.deleteCronJob(transactionId);

      this.logger.log(`One-time job ${transactionId} executed`);
    });

    // Register job inside Nest scheduler
    this.schedulerRegistry.addCronJob(transactionId, job);

    // Start cron job
    job.start();

    return {
      status: 'SCHEDULED_ONE_TIME',
      transactionId,
      executeAt: executionDate,
    };
  }

  // ======================================================
  // RECURRING JOB USING CRON + STOPPER LOGIC
  // ======================================================

  private createRecurringJob(
    data: ScheduleTransactionDto,
    transactionId: string,
  ) {
    const { frequency, interval } = data;

    if (!frequency || !interval) {
      throw new BadRequestException(
        'Both interval and frequency are required for recurring jobs',
      );
    }

    const executionDate = new Date(data.scheduleAt);

    if (executionDate.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule time must be in the future');
    }

    // Convert interval to cron expression
    const cronExpression = this.convertIntervalToCron(interval);

    let executedCount = 0;

    const job = new CronJob(
      cronExpression,

      // ===========================
      // CRON CALLBACK EXECUTION
      // ===========================
      async () => {
        // If current time is before scheduleAt, skip execution
        if (new Date() < executionDate) {
          return;
        }

        // Stopper logic: check execution limit
        if (executedCount >= frequency) {
          job.stop(); // stop cron engine
          this.schedulerRegistry.deleteCronJob(transactionId); // remove from registry

          this.logger.log(
            `Recurring job ${transactionId} completed after ${executedCount} executions`,
          );

          return;
        }

        // Dispatch transaction to queue
        await this.sendToQueue(data, transactionId);

        executedCount++;
      },

      null,
      false, // do not auto start
    );

    // Register cron job
    this.schedulerRegistry.addCronJob(transactionId, job);

    // Start cron engine
    job.start();

    return {
      status: 'SCHEDULED_RECURRING',
      transactionId,
      interval,
      frequency,
      startAt: executionDate,
    };
  }

  // ======================================================
  // CONVERT CUSTOM INTERVAL TO CRON EXPRESSION
  // ======================================================

  private convertIntervalToCron(interval: {
    unit: Interval;
    value: number;
  }): string {
    const { unit, value } = interval;

    switch (unit) {
      case Interval.SECOND:
        return `*/${value} * * * * *`; // every X seconds
      case Interval.MINUTE:
        return `0 */${value} * * * *`; // every X minutes
      case Interval.HOUR:
        return `0 0 */${value} * * *`; // every X hours
      case Interval.DAY:
        return `0 0 0 */${value} * *`; // every X days
      default:
        throw new BadRequestException('Invalid interval unit');
    }
  }

  // ======================================================
  // QUEUE DISPATCH
  // ======================================================

  private async sendToQueue(
    data: ScheduleTransactionDto,
    transactionId: string,
  ) {
    const payload = { ...data, transactionId };

    this.logger.log(`Dispatching transaction ${transactionId}`);

    await firstValueFrom(
      this.queueClient.send('process_transaction', payload),
    );
  }
}
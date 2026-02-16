import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './app.service';

@Controller()
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  @MessagePattern('schedule_transaction')
  async scheduleTransaction(
    @Payload() data: {
      userId: number;
      amount: number;
      type: 'DEPOSIT' | 'WITHDRAW';
      scheduleAt: string;
    },
  ) {
    this.logger.log(
      `Received schedule_transaction: ${JSON.stringify(data)}`,
    );

    return this.schedulerService.scheduleTransaction(data);
  }
}

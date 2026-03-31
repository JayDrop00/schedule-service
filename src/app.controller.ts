import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './app.service';
import { ScheduleTransactionDto } from './dto/schedule.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SchedulerController.name);
  }

  @MessagePattern('schedule_transaction')
  async handleScheduleTransaction(@Payload() data: any) {
    const dto = plainToInstance(ScheduleTransactionDto, data);
    await validateOrReject(dto); // will throw if invalid

    this.logger.info(`Scheduling transaction: ${JSON.stringify(dto)}`);

    return this.schedulerService.scheduleTransaction(dto);
  }
}
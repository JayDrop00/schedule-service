import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './app.service';
import { ScheduleTransactionDto } from './dto/schedule.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

@Controller()
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  @MessagePattern('schedule_transaction')
    async handleScheduleTransaction(@Payload() data: any) {
      const dto = plainToInstance(ScheduleTransactionDto, data);
      await validateOrReject(dto); // will throw if invalid
      return this.schedulerService.scheduleTransaction(dto);
  }
}
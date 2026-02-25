import {
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Interval } from 'src/enums/interval.enum';
import { TransactionType } from 'src/enums/transaction-type.enum';

class IntervalDto {
  @IsEnum(Interval)
  unit : Interval;

  @IsNumber()
  value: number;
}

export class ScheduleTransactionDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsDateString()
  scheduleAt: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntervalDto)
  interval?: IntervalDto;

  @IsOptional()
  frequency?: number;


}
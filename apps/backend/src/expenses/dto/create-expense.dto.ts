import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  title: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  occurredAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

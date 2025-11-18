import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

import { DateRangeDto } from '../../common/dto/date-range.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterExpensesDto extends PaginationDto {
  @IsOptional()
  period?: 'day' | 'week' | 'month';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  range?: DateRangeDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

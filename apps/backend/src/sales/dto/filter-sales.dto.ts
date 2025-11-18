import { PaymentMethod, SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

import { DateRangeDto } from '../../common/dto/date-range.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterSalesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  period?: 'day' | 'week' | 'month';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  range?: DateRangeDto;
}

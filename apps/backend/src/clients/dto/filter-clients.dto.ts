import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

import { DateRangeDto } from '../../common/dto/date-range.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterClientsDto extends PaginationDto {
  @IsOptional()
  period?: 'day' | 'week' | 'month';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  range?: DateRangeDto;

  @IsOptional()
  @IsString()
  search?: string;
}

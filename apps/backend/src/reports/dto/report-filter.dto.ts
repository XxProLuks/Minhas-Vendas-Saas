import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { DateRangeDto } from '../../common/dto/date-range.dto.js';

export class ReportFilterDto {
  @IsOptional()
  period?: 'day' | 'week' | 'month';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  range?: DateRangeDto;
}

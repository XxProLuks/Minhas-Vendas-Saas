import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ReportFilterDto } from './dto/report-filter.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser('id') userId: string, @Query() filter: ReportFilterDto) {
    return this.reportsService.getOverview(userId, filter);
  }

  @Get('trends')
  trends(@CurrentUser('id') userId: string, @Query('months') months?: string) {
    const parsed = months ? Number(months) : 6;
    return this.reportsService.getMonthlyTrends(userId, Number.isFinite(parsed) && parsed > 0 ? parsed : 6);
  }

  @Get('payment-methods')
  paymentMethods(@CurrentUser('id') userId: string, @Query() filter: ReportFilterDto) {
    return this.reportsService.getPaymentBreakdown(userId, filter);
  }

  @Get('top-customers')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  topCustomers(
    @CurrentUser('id') userId: string,
    @Query() filter: ReportFilterDto,
    @Query('limit') limit?: string
  ) {
    const parsed = limit ? Number(limit) : 5;
    const sanitized = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
    return this.reportsService.getTopCustomers(userId, filter, sanitized);
  }
}

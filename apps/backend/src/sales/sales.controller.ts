import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { FilterSalesDto } from './dto/filter-sales.dto.js';
import { UpdateSaleDto } from './dto/update-sale.dto.js';
import { SalesService } from './sales.service.js';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() payload: CreateSaleDto) {
    return this.salesService.create(userId, payload);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: FilterSalesDto) {
    return this.salesService.findAll(userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.salesService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() payload: UpdateSaleDto
  ) {
    return this.salesService.update(userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.salesService.remove(userId, id);
  }
}

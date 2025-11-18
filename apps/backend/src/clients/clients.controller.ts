import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { FilterClientsDto } from './dto/filter-clients.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ClientsService } from './clients.service.js';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() payload: CreateClientDto) {
    return this.clientsService.create(userId, payload);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: FilterClientsDto) {
    return this.clientsService.findAll(userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.clientsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() payload: UpdateClientDto
  ) {
    return this.clientsService.update(userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.clientsService.remove(userId, id);
  }
}

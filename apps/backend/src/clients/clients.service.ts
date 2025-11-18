import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { buildPagination } from '../common/utils/pagination.util.js';
import { getDateRange } from '../common/utils/date-range.util.js';
import { canCreateResource } from '../common/utils/plan.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { FilterClientsDto } from './dto/filter-clients.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService, private readonly usersService: UsersService) {}

  async create(userId: string, payload: CreateClientDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const customerCount = await this.prisma.customer.count({ where: { userId } });
    if (!canCreateResource(user.plan, customerCount, 'customers')) {
      throw new ForbiddenException('Limite de clientes atingido para o plano atual');
    }

    return this.prisma.customer.create({
      data: {
        ...payload,
        userId
      }
    });
  }

  async findAll(userId: string, filters: FilterClientsDto) {
    await this.ensureUser(userId);
    const { page, perPage, skip, take } = buildPagination(filters);

    const { start, end } = filters.period ? getDateRange(filters.period) : { start: undefined, end: undefined };

    const createdAtFilters = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
      ...(filters.range?.startDate ? { gte: filters.range.startDate } : {}),
      ...(filters.range?.endDate ? { lte: filters.range.endDate } : {})
    };

    const where: Prisma.CustomerWhereInput = {
      userId,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search, mode: 'insensitive' } },
              { address: { contains: filters.search, mode: 'insensitive' } },
              { notes: { contains: filters.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(Object.keys(createdAtFilters).length ? { createdAt: createdAtFilters } : {})
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          _count: {
            select: {
              sales: true
            }
          }
        }
      }),
      this.prisma.customer.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage
      }
    };
  }

  async findOne(userId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, userId },
      include: { sales: true }
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return customer;
  }

  async update(userId: string, id: string, payload: UpdateClientDto) {
    await this.ensureOwnership(userId, id);
    return this.prisma.customer.update({
      where: { id },
      data: payload
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }

  private async ensureUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  private async ensureOwnership(userId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, userId } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
  }
}

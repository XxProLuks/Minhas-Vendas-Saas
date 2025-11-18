import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { canCreateResource } from '../common/utils/plan.util.js';
import { getDateRange } from '../common/utils/date-range.util.js';
import { buildPagination } from '../common/utils/pagination.util.js';
import { FilterSalesDto } from './dto/filter-sales.dto.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { UpdateSaleDto } from './dto/update-sale.dto.js';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService, private readonly usersService: UsersService) {}

  async create(userId: string, payload: CreateSaleDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { start, end } = getDateRange('month');
    const salesCount = await this.prisma.sale.count({
      where: { userId, soldAt: { gte: start, lte: end } }
    });

    if (!canCreateResource(user.plan, salesCount, 'sales')) {
      throw new ForbiddenException('Limite de vendas atingido para o plano atual');
    }

    return this.prisma.sale.create({
      data: {
        ...payload,
        soldAt: payload.soldAt ?? new Date(),
        userId
      },
      include: {
        customer: true
      }
    });
  }

  async findAll(userId: string, filters: FilterSalesDto) {
    const { page, perPage, skip, take } = buildPagination(filters);

    const { start, end } = filters.period ? getDateRange(filters.period) : { start: undefined, end: undefined };

    const soldAtFilters = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
      ...(filters.range?.startDate ? { gte: filters.range.startDate } : {}),
      ...(filters.range?.endDate ? { lte: filters.range.endDate } : {})
    };

    const where = {
      userId,
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(Object.keys(soldAtFilters).length ? { soldAt: soldAtFilters } : {})
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: { soldAt: 'desc' },
        skip,
        take,
        include: { customer: true }
      }),
      this.prisma.sale.count({ where })
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
    const sale = await this.prisma.sale.findFirst({
      where: { id, userId },
      include: { customer: true }
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    return sale;
  }

  async update(userId: string, id: string, payload: UpdateSaleDto) {
    await this.ensureOwnership(userId, id);
    return this.prisma.sale.update({
      where: { id },
      data: payload,
      include: { customer: true }
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    await this.prisma.sale.delete({ where: { id } });
    return { success: true };
  }

  private async ensureOwnership(userId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, userId } });
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }
  }
}

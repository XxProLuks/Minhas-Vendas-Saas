import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { buildPagination } from '../common/utils/pagination.util.js';
import { getDateRange } from '../common/utils/date-range.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { FilterExpensesDto } from './dto/filter-expenses.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly usersService: UsersService) {}

  async create(userId: string, payload: CreateExpenseDto) {
    await this.ensureUser(userId);

    return this.prisma.expense.create({
      data: {
        title: payload.title,
        amount: new Prisma.Decimal(payload.amount),
        occurredAt: payload.occurredAt ?? new Date(),
        notes: payload.notes,
        userId
      }
    });
  }

  async findAll(userId: string, filters: FilterExpensesDto) {
    await this.ensureUser(userId);
    const { page, perPage, skip, take } = buildPagination(filters);

    const { start, end } = filters.period ? getDateRange(filters.period) : { start: undefined, end: undefined };

    const occurredAtFilters = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
      ...(filters.range?.startDate ? { gte: filters.range.startDate } : {}),
      ...(filters.range?.endDate ? { lte: filters.range.endDate } : {})
    };

    const amountFilters = {
      ...(filters.minAmount !== undefined ? { gte: new Prisma.Decimal(filters.minAmount) } : {}),
      ...(filters.maxAmount !== undefined ? { lte: new Prisma.Decimal(filters.maxAmount) } : {})
    };

    const where: Prisma.ExpenseWhereInput = {
      userId,
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { notes: { contains: filters.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(Object.keys(occurredAtFilters).length ? { occurredAt: occurredAtFilters } : {}),
      ...(Object.keys(amountFilters).length ? { amount: amountFilters } : {})
    };

    const [data, total, aggregate] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalAmount: aggregate._sum.amount ?? new Prisma.Decimal(0)
      }
    };
  }

  async findOne(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, userId } });
    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    return expense;
  }

  async update(userId: string, id: string, payload: UpdateExpenseDto) {
    await this.ensureOwnership(userId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...payload,
        ...(payload.amount !== undefined ? { amount: new Prisma.Decimal(payload.amount) } : {})
      }
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  private async ensureUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  private async ensureOwnership(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, userId } });
    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }
  }
}

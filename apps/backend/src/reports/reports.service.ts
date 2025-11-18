import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';

import { getDateRange } from '../common/utils/date-range.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportFilterDto } from './dto/report-filter.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, filter: ReportFilterDto) {
    const { start, end } = this.resolveRange(filter);
    const saleWhere: Prisma.SaleWhereInput = {
      userId,
      ...(start || end ? { soldAt: this.buildDateFilter(start, end) } : {})
    };
    const expenseWhere: Prisma.ExpenseWhereInput = {
      userId,
      ...(start || end ? { occurredAt: this.buildDateFilter(start, end) } : {})
    };
    const customerWhere: Prisma.CustomerWhereInput = {
      userId,
      ...(start || end ? { createdAt: this.buildDateFilter(start, end) } : {})
    };

    const [salesAggregate, expensesAggregate, paidSales, pendingSales, newCustomers] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true
      }),
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true }
      }),
      this.prisma.sale.count({ where: { ...saleWhere, status: SaleStatus.PAID } }),
      this.prisma.sale.count({ where: { ...saleWhere, status: SaleStatus.PENDING } }),
      this.prisma.customer.count({ where: customerWhere })
    ]);

    const totalSales = salesAggregate._sum.amount?.toNumber() ?? 0;
    const totalExpenses = expensesAggregate._sum.amount?.toNumber() ?? 0;
    const netRevenue = totalSales - totalExpenses;
    const averageTicket = salesAggregate._avg.amount?.toNumber() ?? 0;
    const salesCount = typeof salesAggregate._count === 'number' ? salesAggregate._count : 0;

    return {
      totalSales,
      totalExpenses,
      netRevenue,
      averageTicket,
      salesCount,
      paidSales,
      pendingSales,
      newCustomers
    };
  }

  async getMonthlyTrends(userId: string, months = 6) {
    const now = new Date();
    const buckets = Array.from({ length: months }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    });

    const results: Array<{ month: string; sales: number; expenses: number }> = [];

    for (const bucket of buckets) {
      const [sales, expenses] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { userId, soldAt: this.buildDateFilter(bucket.start, bucket.end), status: SaleStatus.PAID },
          _sum: { amount: true }
        }),
        this.prisma.expense.aggregate({
          where: { userId, occurredAt: this.buildDateFilter(bucket.start, bucket.end) },
          _sum: { amount: true }
        })
      ]);

      results.push({
        month: bucket.start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        sales: sales._sum.amount?.toNumber() ?? 0,
        expenses: expenses._sum.amount?.toNumber() ?? 0
      });
    }

    return results;
  }

  async getPaymentBreakdown(userId: string, filter: ReportFilterDto) {
    const { start, end } = this.resolveRange(filter);

    const groups = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        userId,
        status: SaleStatus.PAID,
        ...(start || end ? { soldAt: this.buildDateFilter(start, end) } : {})
      },
      _sum: { amount: true },
      _count: { _all: true }
    });

    const totals = groups.reduce(
      (acc, group) => {
        const amount = group._sum.amount?.toNumber() ?? 0;
        acc.totalAmount += amount;
        acc.totalCount += group._count._all ?? 0;
        return acc;
      },
      { totalAmount: 0, totalCount: 0 }
    );

    return groups.map((group) => {
      const amount = group._sum.amount?.toNumber() ?? 0;
      const count = group._count._all ?? 0;
      return {
        method: group.paymentMethod,
        amount,
        count,
        amountShare: totals.totalAmount ? amount / totals.totalAmount : 0,
        countShare: totals.totalCount ? count / totals.totalCount : 0
      };
    });
  }

  async getTopCustomers(userId: string, filter: ReportFilterDto, limit = 5) {
    const { start, end } = this.resolveRange(filter);

    const grouped = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        userId,
        customerId: { not: null },
        status: SaleStatus.PAID,
        ...(start || end ? { soldAt: this.buildDateFilter(start, end) } : {})
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit
    });

    const customerIds = grouped.map((item) => item.customerId) as string[];
    if (!customerIds.length) {
      return [];
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } }
    });

    return grouped.map((item) => {
      const customer = customers.find((c) => c.id === item.customerId);
      return {
        customer,
        totalAmount: item._sum.amount?.toNumber() ?? 0,
        salesCount: item._count._all ?? 0
      };
    });
  }

  private resolveRange(filter: ReportFilterDto): { start?: Date; end?: Date } {
    if (filter.range?.startDate || filter.range?.endDate) {
      return {
        start: filter.range?.startDate,
        end: filter.range?.endDate
      };
    }

    const period = filter.period ?? 'month';
    return getDateRange(period);
  }

  private buildDateFilter(start?: Date, end?: Date): Prisma.DateTimeFilter {
    return {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {})
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PlanType, Role } from '@prisma/client';

import { PLAN_LIMITS } from '../common/constants/plan-limits.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserDto) {
    return this.prisma.user.create({
      data
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async setEmailVerified(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() }
    });
  }

  async updatePlan(id: string, plan: PlanType, expiresAt?: Date | null) {
    return this.prisma.user.update({
      where: { id },
      data: { plan, planExpiresAt: expiresAt ?? null }
    });
  }

  async promoteToAdmin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role: Role.ADMIN }
    });
  }

  getPlanLimits(plan: PlanType) {
    return PLAN_LIMITS[plan];
  }
}
import { PlanType } from '@prisma/client';

import { PLAN_LIMITS } from '../constants/plan-limits.js';

export function canCreateResource(plan: PlanType, currentCount: number, type: 'sales' | 'customers') {
  const limits = PLAN_LIMITS[plan];
  const limit = type === 'sales' ? limits.maxSalesPerMonth : limits.maxCustomers;

  if (limit === null) {
    return true;
  }

  return currentCount < limit;
}

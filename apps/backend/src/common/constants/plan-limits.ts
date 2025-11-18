import { PlanType } from '@prisma/client';

export const PLAN_LIMITS: Record<PlanType, { maxSalesPerMonth: number | null; maxCustomers: number | null }> = {
  [PlanType.FREE]: {
    maxSalesPerMonth: 100,
    maxCustomers: 50
  },
  [PlanType.PRO]: {
    maxSalesPerMonth: 1000,
    maxCustomers: 500
  },
  [PlanType.PREMIUM]: {
    maxSalesPerMonth: null,
    maxCustomers: null
  }
};

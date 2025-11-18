import { PlanType } from '@prisma/client';

export const PLAN_PRICING: Record<PlanType, { price: number; currency: string; interval: 'month' | 'year' }> = {
  [PlanType.FREE]: {
    price: 0,
    currency: 'BRL',
    interval: 'month'
  },
  [PlanType.PRO]: {
    price: 59.9,
    currency: 'BRL',
    interval: 'month'
  },
  [PlanType.PREMIUM]: {
    price: 129.9,
    currency: 'BRL',
    interval: 'month'
  }
};

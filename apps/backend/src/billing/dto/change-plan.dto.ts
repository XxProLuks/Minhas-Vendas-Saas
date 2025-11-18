import { PlanType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangePlanDto {
  @IsEnum(PlanType)
  plan: PlanType;
}

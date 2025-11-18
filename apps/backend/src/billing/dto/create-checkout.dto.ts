import { PlanType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateCheckoutDto {
  @IsEnum(PlanType)
  plan: PlanType;
}

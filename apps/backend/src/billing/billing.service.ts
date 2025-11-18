import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import MercadoPagoConfig, { PreApproval } from 'mercadopago';

import { PLAN_PRICING } from '../common/constants/plan-pricing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';

type MercadoPagoStatus = 'authorized' | 'paused' | 'cancelled' | 'pending' | 'rejected' | 'finished';

type WebhookPayload = {
  type?: string;
  action?: string;
  data?: {
    id?: string;
  };
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly preapproval: PreApproval;
  private readonly planIds: Record<PlanType, string>;
  private readonly backUrl: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {
    const accessToken = this.configService.get<string>('mercadopago.accessToken') ?? '';
    this.isConfigured = Boolean(accessToken);

    if (!this.isConfigured) {
      this.logger.warn('Mercado Pago access token is not configured. Billing features will be limited.');
    }

    const client = new MercadoPagoConfig({ accessToken });
    this.preapproval = new PreApproval(client);
    this.backUrl = this.configService.get<string>('mercadopago.backUrl') ?? '';
    this.planIds = {
      [PlanType.FREE]: this.configService.get<string>('mercadopago.planFreeId') ?? '',
      [PlanType.PRO]: this.configService.get<string>('mercadopago.planProId') ?? '',
      [PlanType.PREMIUM]: this.configService.get<string>('mercadopago.planPremiumId') ?? ''
    };
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return subscription;
  }

  async createCheckout(userId: string, plan: PlanType) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (plan === PlanType.FREE) {
      await this.applyFreePlan(userId);
      return {
        type: 'free-plan',
        success: true
      };
    }

    if (!this.isConfigured) {
      throw new NotFoundException('Mercado Pago não está configurado');
    }

    const current = await this.getCurrentSubscription(userId);
    if (current && current.plan === plan && current.status === SubscriptionStatus.ACTIVE) {
      return {
        type: 'already-active',
        subscription: current
      };
    }

    const preapprovalPlanId = this.planIds[plan];
    if (!preapprovalPlanId) {
      throw new NotFoundException('Plano não configurado no Mercado Pago');
    }

    const pricing = PLAN_PRICING[plan];

    const response = await this.preapproval.create({
      body: {
        preapproval_plan_id: preapprovalPlanId,
        reason: `Assinatura plano ${plan}`,
        external_reference: user.id,
        auto_recurring: {
          frequency: 1,
          frequency_type: pricing.interval === 'month' ? 'months' : 'years',
          transaction_amount: pricing.price,
          currency_id: pricing.currency.toUpperCase()
        },
        back_url: this.backUrl,
        payer_email: user.email
      }
    });

    await this.prisma.subscription.upsert({
      where: { providerId: response.id },
      update: {
        plan,
        status: SubscriptionStatus.INACTIVE,
        userId: user.id
      },
      create: {
        userId: user.id,
        plan,
        providerId: response.id,
        status: SubscriptionStatus.INACTIVE
      }
    });

    return {
      type: 'checkout',
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      subscriptionId: response.id
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura ativa encontrada');
    }

    if (subscription.providerId && this.isConfigured) {
      try {
        await this.preapproval.update({
          id: subscription.providerId,
          body: { status: 'cancelled' }
        });
      } catch (error) {
        this.logger.error('Failed to cancel subscription on Mercado Pago', error instanceof Error ? error.message : error);
      }
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELED }
    });

    await this.usersService.updatePlan(userId, PlanType.FREE, null);

    return { success: true };
  }

  async handleWebhook(payload: WebhookPayload) {
    if (!payload?.data?.id) {
      this.logger.warn('Webhook received without data ID');
      return { received: true };
    }

    if (!this.isConfigured) {
      this.logger.warn('Webhook received but Mercado Pago is not configured');
      return { received: true };
    }

    try {
      const preapproval = await this.preapproval.get({ id: payload.data.id });
      if (!preapproval) {
        this.logger.warn(`Preapproval ${payload.data.id} not found on Mercado Pago`);
        return { received: true };
      }

      const userId = preapproval.external_reference;
      if (!userId) {
        this.logger.warn(`Preapproval ${payload.data.id} missing external reference`);
        return { received: true };
      }

      const plan = this.resolvePlan(preapproval.preapproval_plan_id);
      const status = this.mapStatus(preapproval.status as MercadoPagoStatus);
      const periodEnd = preapproval.auto_recurring?.end_date
        ? new Date(preapproval.auto_recurring.end_date)
        : preapproval.next_payment_date
          ? new Date(preapproval.next_payment_date)
          : null;

      await this.prisma.subscription.upsert({
        where: { providerId: preapproval.id },
        update: {
          status,
          plan,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: preapproval.status === 'paused'
        },
        create: {
          userId,
          plan,
          providerId: preapproval.id,
          status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: preapproval.status === 'paused'
        }
      });

      if (status === SubscriptionStatus.ACTIVE && plan) {
        await this.usersService.updatePlan(userId, plan, periodEnd ?? null);
      }

      if (status === SubscriptionStatus.CANCELED) {
        await this.usersService.updatePlan(userId, PlanType.FREE, null);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Error handling Mercado Pago webhook', error instanceof Error ? error.message : error);
      return { received: true };
    }
  }

  private resolvePlan(preapprovalPlanId?: string): PlanType {
    const entries = Object.entries(this.planIds) as Array<[PlanType, string]>;
    for (const [plan, id] of entries) {
      if (id && id === preapprovalPlanId) {
        return plan;
      }
    }
    return PlanType.FREE;
  }

  private mapStatus(status?: MercadoPagoStatus): SubscriptionStatus {
    switch (status) {
      case 'authorized':
        return SubscriptionStatus.ACTIVE;
      case 'paused':
        return SubscriptionStatus.PAST_DUE;
      case 'cancelled':
        return SubscriptionStatus.CANCELED;
      case 'finished':
      case 'rejected':
        return SubscriptionStatus.INACTIVE;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  private async applyFreePlan(userId: string) {
    await this.usersService.updatePlan(userId, PlanType.FREE, null);
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { status: SubscriptionStatus.INACTIVE }
    });
  }
}

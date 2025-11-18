import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { BillingService } from './billing.service.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@CurrentUser('id') userId: string) {
    return this.billingService.getCurrentSubscription(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckout(@CurrentUser('id') userId: string, @Body() payload: CreateCheckoutDto) {
    return this.billingService.createCheckout(userId, payload.plan);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@CurrentUser('id') userId: string) {
    return this.billingService.cancelSubscription(userId);
  }

  @Post('webhook')
  async webhook(@Body() payload: Record<string, any>) {
    return this.billingService.handleWebhook(payload);
  }
}

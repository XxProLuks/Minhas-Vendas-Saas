import { registerAs } from '@nestjs/config';

export default registerAs('mercadopago', () => ({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
  backUrl: process.env.MERCADOPAGO_BACK_URL || 'http://localhost:3333/api/billing/webhook',
  planFreeId: process.env.MERCADOPAGO_PLAN_FREE_ID || '',
  planProId: process.env.MERCADOPAGO_PLAN_PRO_ID || '',
  planPremiumId: process.env.MERCADOPAGO_PLAN_PREMIUM_ID || ''
}));
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3333', 10),
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d'
  },
  throttle: {
    ttl: parseInt(process.env.GLOBAL_RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.GLOBAL_RATE_LIMIT_LIMIT || '100', 10)
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no-reply@minhasvendas.app'
  }
}));
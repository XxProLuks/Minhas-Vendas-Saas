import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import appConfig from './config/app.config.js';
import mercadopagoConfig from './config/mercadopago.config.js';
import resendConfig from './config/resend.config.js';
import { ClientsModule } from './clients/clients.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SalesModule } from './sales/sales.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, mercadopagoConfig, resendConfig]
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100
      }
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    SalesModule,
    ExpensesModule,
    ClientsModule,
    ReportsModule,
    BillingModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
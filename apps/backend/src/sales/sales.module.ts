import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';

@Module({
  imports: [UsersModule],
  controllers: [SalesController],
  providers: [SalesService]
})
export class SalesModule {}

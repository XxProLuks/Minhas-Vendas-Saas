import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [UsersModule],
  controllers: [ClientsController],
  providers: [ClientsService]
})
export class ClientsModule {}

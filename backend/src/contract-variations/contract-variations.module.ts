import { Module } from '@nestjs/common';
import { ContractVariationsController } from './contract-variations.controller';
import { ContractVariationsService } from './contract-variations.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ContractVariationsController],
  providers: [ContractVariationsService],
  exports: [ContractVariationsService],
  imports: [NotificationsModule],
})
export class ContractVariationsModule {}

import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService],
  imports: [NotificationsModule],
})
export class PurchaseRequestsModule {}

import { Module } from '@nestjs/common';
import { PurchaseConfirmsController } from './purchase-confirms.controller';
import { PurchaseConfirmsService } from './purchase-confirms.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [PurchaseConfirmsController],
  providers: [PurchaseConfirmsService],
  exports: [PurchaseConfirmsService],
  imports: [NotificationsModule],
})
export class PurchaseConfirmsModule {}

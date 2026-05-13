import { Module } from '@nestjs/common';
import { DeliveryNoticesController } from './delivery-notices.controller';
import { DeliveryNoticesService } from './delivery-notices.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [DeliveryNoticesController],
  providers: [DeliveryNoticesService],
  exports: [DeliveryNoticesService],
  imports: [NotificationsModule],
})
export class DeliveryNoticesModule {}

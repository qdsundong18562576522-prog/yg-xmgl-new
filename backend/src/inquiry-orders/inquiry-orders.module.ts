import { Module } from '@nestjs/common';
import { InquiryOrdersController } from './inquiry-orders.controller';
import { InquiryOrdersService } from './inquiry-orders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [InquiryOrdersController],
  providers: [InquiryOrdersService],
  exports: [InquiryOrdersService],
  imports: [NotificationsModule],
})
export class InquiryOrdersModule {}

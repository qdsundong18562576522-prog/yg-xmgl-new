import { Module } from '@nestjs/common';
import { DeliveryNoticesController } from './delivery-notices.controller';
import { DeliveryNoticesService } from './delivery-notices.service';

@Module({
  controllers: [DeliveryNoticesController],
  providers: [DeliveryNoticesService],
  exports: [DeliveryNoticesService],
})
export class DeliveryNoticesModule {}

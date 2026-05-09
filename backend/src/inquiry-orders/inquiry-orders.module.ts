import { Module } from '@nestjs/common';
import { InquiryOrdersController } from './inquiry-orders.controller';
import { InquiryOrdersService } from './inquiry-orders.service';

@Module({
  controllers: [InquiryOrdersController],
  providers: [InquiryOrdersService],
  exports: [InquiryOrdersService],
})
export class InquiryOrdersModule {}

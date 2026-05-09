import { Module } from '@nestjs/common';
import { PurchaseConfirmsController } from './purchase-confirms.controller';
import { PurchaseConfirmsService } from './purchase-confirms.service';

@Module({
  controllers: [PurchaseConfirmsController],
  providers: [PurchaseConfirmsService],
  exports: [PurchaseConfirmsService],
})
export class PurchaseConfirmsModule {}

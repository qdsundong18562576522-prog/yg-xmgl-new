import { Module } from '@nestjs/common';
import { CompanyInventoryController } from './company-inventory.controller';
import { CompanyInventoryService } from './company-inventory.service';

@Module({
  controllers: [CompanyInventoryController],
  providers: [CompanyInventoryService],
  exports: [CompanyInventoryService],
})
export class CompanyInventoryModule {}

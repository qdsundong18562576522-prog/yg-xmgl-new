import { Module } from '@nestjs/common';
import { MaterialRequisitionsController } from './material-requisitions.controller';
import { MaterialRequisitionsService } from './material-requisitions.service';

@Module({
  controllers: [MaterialRequisitionsController],
  providers: [MaterialRequisitionsService],
  exports: [MaterialRequisitionsService],
})
export class MaterialRequisitionsModule {}

import { Module } from '@nestjs/common';
import { MaterialRequisitionsController } from './material-requisitions.controller';
import { MaterialRequisitionsService } from './material-requisitions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [MaterialRequisitionsController],
  providers: [MaterialRequisitionsService],
  exports: [MaterialRequisitionsService],
  imports: [NotificationsModule],
})
export class MaterialRequisitionsModule {}

import { Module } from '@nestjs/common';
import { ApprovalHistoryController } from './approval-history.controller';

@Module({
  controllers: [ApprovalHistoryController],
})
export class ApprovalHistoryModule {}

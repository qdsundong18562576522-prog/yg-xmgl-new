import { Module } from '@nestjs/common';
import { StockOutController } from './stock-out.controller';
import { StockOutService } from './stock-out.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [StockOutController],
  providers: [StockOutService],
  exports: [StockOutService],
  imports: [NotificationsModule],
})
export class StockOutModule {}

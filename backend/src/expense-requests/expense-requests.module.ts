import { Module } from '@nestjs/common';
import { ExpenseRequestsController } from './expense-requests.controller';
import { ExpenseRequestsService } from './expense-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ controllers: [ExpenseRequestsController], providers: [ExpenseRequestsService], exports: [ExpenseRequestsService], imports: [NotificationsModule] })
export class ExpenseRequestsModule {}

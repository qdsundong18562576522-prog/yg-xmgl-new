import { Module } from '@nestjs/common';
import { ExpenseRequestsController } from './expense-requests.controller';
import { ExpenseRequestsService } from './expense-requests.service';
@Module({ controllers: [ExpenseRequestsController], providers: [ExpenseRequestsService], exports: [ExpenseRequestsService] })
export class ExpenseRequestsModule {}

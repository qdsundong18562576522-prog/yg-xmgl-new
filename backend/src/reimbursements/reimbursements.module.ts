import { Module } from '@nestjs/common';
import { ReimbursementsController } from './reimbursements.controller';
import { ReimbursementsService } from './reimbursements.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ controllers: [ReimbursementsController], providers: [ReimbursementsService], exports: [ReimbursementsService], imports: [NotificationsModule] })
export class ReimbursementsModule {}

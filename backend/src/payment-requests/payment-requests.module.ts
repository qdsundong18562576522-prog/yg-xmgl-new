import { Module } from '@nestjs/common';
import { PaymentRequestsController } from './payment-requests.controller';
import { PaymentRequestsService } from './payment-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ controllers: [PaymentRequestsController], providers: [PaymentRequestsService], exports: [PaymentRequestsService], imports: [NotificationsModule] })
export class PaymentRequestsModule {}

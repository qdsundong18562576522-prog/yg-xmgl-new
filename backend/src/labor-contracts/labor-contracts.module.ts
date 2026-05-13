import { Module } from '@nestjs/common';
import { LaborContractsController } from './labor-contracts.controller';
import { LaborContractsService } from './labor-contracts.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ controllers: [LaborContractsController], providers: [LaborContractsService], exports: [LaborContractsService], imports: [NotificationsModule] })
export class LaborContractsModule {}

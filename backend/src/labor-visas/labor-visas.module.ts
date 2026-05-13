import { Module } from '@nestjs/common';
import { LaborVisasController } from './labor-visas.controller';
import { LaborVisasService } from './labor-visas.service';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ controllers: [LaborVisasController], providers: [LaborVisasService], exports: [LaborVisasService], imports: [NotificationsModule] })
export class LaborVisasModule {}

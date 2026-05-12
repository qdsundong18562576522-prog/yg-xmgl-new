import { Module } from '@nestjs/common';
import { LaborVisasController } from './labor-visas.controller';
import { LaborVisasService } from './labor-visas.service';
@Module({ controllers: [LaborVisasController], providers: [LaborVisasService], exports: [LaborVisasService] })
export class LaborVisasModule {}

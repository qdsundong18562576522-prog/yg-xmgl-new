import { Module } from '@nestjs/common';
import { ProjectReceivablesController } from './project-receivables.controller';
import { ProjectReceivablesService } from './project-receivables.service';
@Module({ controllers: [ProjectReceivablesController], providers: [ProjectReceivablesService], exports: [ProjectReceivablesService] })
export class ProjectReceivablesModule {}

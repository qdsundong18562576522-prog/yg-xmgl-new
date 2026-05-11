import { Module } from '@nestjs/common';
import { ProjectInventoryController } from './project-inventory.controller';
import { ProjectInventoryService } from './project-inventory.service';

@Module({
  controllers: [ProjectInventoryController],
  providers: [ProjectInventoryService],
  exports: [ProjectInventoryService],
})
export class ProjectInventoryModule {}

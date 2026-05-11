import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProjectInventoryService } from './project-inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('project-inventory')
@UseGuards(JwtAuthGuard)
export class ProjectInventoryController {
  constructor(private service: ProjectInventoryService) {}

  @Get()
  async findByProject(@Query('projectId') projectId?: string) {
    return this.service.findByProject(projectId ? parseInt(projectId) : undefined);
  }
}

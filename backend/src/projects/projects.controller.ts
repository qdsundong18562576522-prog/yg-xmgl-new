import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async findAll(@CurrentUser() user: { userId: number; role: string }) {
    return this.projectsService.findAll(user.userId, user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.findOne(id, user.userId, user.role);
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.create(dto, user.userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.update(id, dto, user.userId, user.role);
  }

  @Post(':id/submit')
  async submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.submitForApproval(id, user.userId, user.role);
  }

  @Post(':id/approve')
  @Roles(UserRole.leader, UserRole.admin)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.approve(id, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.leader, UserRole.admin)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.reject(id, user.userId, body.comment);
  }

  @Get(':id/ledger')
  async getLedger(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getLedger(id);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.delete(id, user.userId, user.role);
  }
}

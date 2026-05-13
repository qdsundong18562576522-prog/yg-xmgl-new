import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProjectReceivablesService } from './project-receivables.service';
import { CreateProjectReceivableDto } from './dto/create-project-receivable.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('project-receivables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectReceivablesController {
  constructor(private service: ProjectReceivablesService) {}
  @Get() async findAll(@Query('projectId') projectId?: string) { return this.service.findAll(projectId ? parseInt(projectId) : undefined); }
  @Get(':id') async findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() async create(@Body() dto: CreateProjectReceivableDto, @CurrentUser() user: any) { return this.service.create(dto, user.userId); }
  @Delete(':id') async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.delete(id, user.userId, user.role); }
}

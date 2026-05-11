import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { MaterialRequisitionsService } from './material-requisitions.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('material-requisitions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialRequisitionsController {
  constructor(private service: MaterialRequisitionsService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateRequisitionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Post(':id/submit')
  async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.submit(id, user.userId, user.role);
  }

  @Post(':id/approve-purchaser')
  @Roles(UserRole.purchaser, UserRole.admin)
  async approvePurchaser(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approvePurchaser(id, user.userId);
  }

  @Post(':id/approve-leader')
  @Roles(UserRole.leader, UserRole.admin)
  async approveLeader(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approveLeader(id, user.userId);
  }

  @Post(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) {
    return this.service.reject(id, user.userId, body.comment);
  }
}

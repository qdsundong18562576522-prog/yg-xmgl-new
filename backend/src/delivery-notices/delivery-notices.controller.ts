import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, Delete } from '@nestjs/common';
import { DeliveryNoticesService } from './delivery-notices.service';
import { CreateDeliveryNoticeDto } from './dto/create-delivery-notice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('delivery-notices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryNoticesController {
  constructor(private service: DeliveryNoticesService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateDeliveryNoticeDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Post(':id/submit')
  async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.submit(id, user.userId, user.role);
  }

  @Post(':id/withdraw')
  async withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.withdraw(id, user.userId, user.role);
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

  @Delete(':id')
  @Roles(UserRole.admin)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.delete(id, user.userId, user.role);
  }
}

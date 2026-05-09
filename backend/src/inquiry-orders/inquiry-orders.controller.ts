import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InquiryOrdersService } from './inquiry-orders.service';
import { CreateInquiryOrderDto, UpdateInquiryOrderDto } from './dto/create-inquiry-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('inquiry-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InquiryOrdersController {
  constructor(private service: InquiryOrdersService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateInquiryOrderDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInquiryOrderDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.userId, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.delete(id, user.userId, user.role);
  }

  @Post(':id/submit')
  async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.submit(id, user.userId, user.role);
  }

  @Post(':id/withdraw')
  async withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.withdraw(id, user.userId, user.role);
  }

  @Post(':id/approve-pm')
  @Roles(UserRole.pm, UserRole.admin)
  async approvePm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approvePm(id, user.userId);
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

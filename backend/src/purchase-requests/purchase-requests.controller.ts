import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequestsController {
  constructor(private service: PurchaseRequestsService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePurchaseRequestDto, @CurrentUser() user: any) {
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

  @Post(':id/approve')
  @Roles(UserRole.leader, UserRole.admin)
  async approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approve(id, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.leader, UserRole.admin)
  async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) {
    return this.service.reject(id, user.userId, body.comment);
  }

  @Post(':id/confirm')
  @Roles(UserRole.purchaser, UserRole.admin)
  async confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.confirm(id, user.userId);
  }
}

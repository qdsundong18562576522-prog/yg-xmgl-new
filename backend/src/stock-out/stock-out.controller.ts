import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { StockOutService } from './stock-out.service';
import { CreateStockOutDto } from './dto/create-stock-out.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('stock-out')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockOutController {
  constructor(private service: StockOutService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateStockOutDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Post(':id/approve-leader')
  @Roles(UserRole.leader, UserRole.admin)
  async approveLeader(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approveLeader(id, user.userId);
  }

  @Post(':id/approve-purchaser')
  @Roles(UserRole.purchaser, UserRole.admin)
  async approvePurchaser(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.approvePurchaser(id, user.userId);
  }

  @Post(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) {
    return this.service.reject(id, user.userId, body.comment);
  }
}

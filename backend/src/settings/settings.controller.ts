import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  // ===== System Config =====

  @Get('config')
  async getAllConfigs() {
    return this.service.getAllConfigs();
  }

  @Get('config/:key')
  async getConfig(@Param('key') key: string) {
    return this.service.getConfig(key);
  }

  @Put('config/:key')
  @Roles(UserRole.admin)
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser() user: any,
  ) {
    return this.service.updateConfig(key, value, user.userId);
  }

  // ===== Dictionary =====

  @Get('dict/types')
  async getDictTypes() {
    return this.service.getDictTypes();
  }

  @Get('dict/:type')
  async getDictByType(@Param('type') type: string) {
    return this.service.getDictByType(type);
  }

  @Post('dict')
  @Roles(UserRole.admin)
  async createDict(@Body() body: any) {
    return this.service.createDict(body);
  }

  @Put('dict/:id')
  @Roles(UserRole.admin)
  async updateDict(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDict(parseInt(id, 10), body);
  }

  @Delete('dict/:id')
  @Roles(UserRole.admin)
  async deleteDict(@Param('id') id: string) {
    return this.service.deleteDict(parseInt(id, 10));
  }

  @Post('dict/:id/toggle')
  @Roles(UserRole.admin)
  async toggleDictStatus(@Param('id') id: string) {
    return this.service.toggleDictStatus(parseInt(id, 10));
  }

  // ===== Operation Logs =====

  @Get('operation-logs')
  async getOperationLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getOperationLogs({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      entityType,
      action,
      userId: userId ? parseInt(userId, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('operation-logs/entity-types')
  async getLogEntityTypes() {
    return this.service.getLogEntityTypes();
  }
}

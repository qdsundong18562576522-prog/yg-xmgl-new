import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Get('pending-approvals')
  async getPendingApprovals(@Query('limit') limit?: string) {
    return this.service.getPendingApprovals(limit ? parseInt(limit, 10) : 10);
  }

  @Get('project-progress')
  async getProjectProgress() {
    return this.service.getProjectProgress();
  }

  @Get('monthly-trend')
  async getMonthlyTrend(@Query('months') months?: string) {
    return this.service.getMonthlyTrend(months ? parseInt(months, 10) : 12);
  }
}

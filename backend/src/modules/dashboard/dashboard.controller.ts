import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent')
  @UseGuards(AdminAuthGuard)
  async getRecent() {
    return this.dashboardService.getRecentData();
  }
}

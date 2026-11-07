import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FilterDashboardDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Can('estadisticas', 'view')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('general')
  genera(@Query() filters: FilterDashboardDto) {
    return this.dashboardService.getGeneral(filters);
  }

  @Get('trends')
  trends(@Query() filters: FilterDashboardDto) {
    return this.dashboardService.getTrends(filters);
  }

  @Get('performance')
  performance(@Query() filters: FilterDashboardDto) {
    return this.dashboardService.getPerformance(filters);
  }

  @Get('offenders')
  offenders(@Query() filters: FilterDashboardDto) {
    return this.dashboardService.getOffenderMetrics(filters);
  }
}

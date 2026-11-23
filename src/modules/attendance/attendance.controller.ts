import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, FilterAttendanceDto } from './dto';
import { Can, JwtAuthGuard, RolesGuard } from '../../auth/guard';
import { SuccessMessage } from '../../common/decorators';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @SuccessMessage('Inasistencias creadas exitosamente')
  @Can('inasistencias', 'create')
  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Can('inasistencias', 'view')
  @Get()
  findAll(@Query() dto: FilterAttendanceDto) {
    return this.attendanceService.findAll(dto);
  }
}

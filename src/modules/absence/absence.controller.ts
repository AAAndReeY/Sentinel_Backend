import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { JwtAuthGuard, Can, RolesGuard } from 'src/auth/guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Can('inasistencias', 'create')
@Controller('absence')
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Post()
  create(@Body() dto: CreateAbsenceDto, @Req() req: Request) {
    return this.absenceService.create(dto, req);
  }
}

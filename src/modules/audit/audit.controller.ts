import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { FilterAuditDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Can('auditoria', 'view')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() dto: FilterAuditDto, @Req() req: Request) {
    return this.auditService.findAll(dto, req);
  }
}

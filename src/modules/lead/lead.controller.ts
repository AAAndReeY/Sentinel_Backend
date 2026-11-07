import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { LeadService } from './lead.service';
import { CreateLeadDto, FilterLeadDto, UpdateLeadDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Can('personal', 'create')
  @Post()
  create(@Body() dto: CreateLeadDto, @Req() req: Request) {
    return this.leadService.create(dto, req);
  }

  @Get()
  findAll(@Query() dto: FilterLeadDto, @Req() req: Request) {
    return this.leadService.findAll(dto, req);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.leadService.findOne(id, req);
  }

  @Can('personal', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    return this.leadService.update(id, dto, req);
  }

  @Can('personal', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.leadService.toggleDelete(id, req);
  }
}

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
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { SearchDto } from '../../common/dto';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Can('cargos', 'create')
  @Post()
  create(@Body() dto: CreateJobDto, @Req() req: Request) {
    return this.jobService.create(dto, req);
  }

  @Get()
  findAll(@Query() dto: SearchDto, @Req() req: Request) {
    return this.jobService.findAll(dto, req);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.jobService.findOne(id, req);
  }

  @Can('cargos', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: Request,
  ) {
    return this.jobService.update(id, dto, req);
  }

  @Can('cargos', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.jobService.toggleDelete(id, req);
  }
}

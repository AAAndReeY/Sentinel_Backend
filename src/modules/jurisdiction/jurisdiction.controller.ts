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
import { JurisdictionService } from './jurisdiction.service';
import { CreateJurisdictionDto, UpdateJurisdictionDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { SearchDto } from '../../common/dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jurisdiction')
export class JurisdictionController {
  constructor(private readonly jurisdictionService: JurisdictionService) {}

  @Can('jurisdicciones', 'create')
  @Post()
  create(@Body() dto: CreateJurisdictionDto, @Req() req: Request) {
    return this.jurisdictionService.create(dto, req);
  }

  @Get()
  findAll(@Query() dto: SearchDto, @Req() req: Request) {
    return this.jurisdictionService.findAll(dto, req);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.jurisdictionService.findOne(id, req);
  }

  @Can('jurisdicciones', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJurisdictionDto,
    @Req() req: Request,
  ) {
    return this.jurisdictionService.update(id, dto, req);
  }

  @Can('jurisdicciones', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.jurisdictionService.toggleDelete(id, req);
  }
}

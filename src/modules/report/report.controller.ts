import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
  UseGuards,
  Query,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportService } from './report.service';
import { CreateReportDto, FilterReportDto, UpdateReportDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { SuccessMessage } from '../../common/decorators';
import { imageFileFilter } from '../../common/filters';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Can('incidencias', 'create')
  @Post()
  @SuccessMessage('Mensaje generado exitosamente')
  create(@Body() dto: CreateReportDto, @Req() req: Request) {
    return this.reportService.create(dto, req);
  }

  @Get('export')
  async exportExcel(@Query() dto: FilterReportDto, @Req() req: Request, @Res() res: Response) {
    const buffer = await this.reportService.exportExcel(dto, req);
    const fecha = new Date().toISOString().substring(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="incidencias_${fecha}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get()
  findAll(@Query() dto: FilterReportDto, @Req() req: Request) {
    return this.reportService.findAll(dto, req);
  }

  /* @Get('range')
  getByRange(@Query() dto: FilterReportDto, @Req() req: Request) {
    return this.reportService.getByRange(dto, req);
  } */

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.reportService.findOne(id, req);
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('descriptions') descriptions: string[] | string,
    @Body() dto: UpdateReportDto,
    @Req() req: Request,
  ) {
    if (typeof descriptions === 'string') descriptions = [descriptions];
    return this.reportService.update(id, dto, files, descriptions, req);
  }

  @Can('incidencias', 'send')
  @Patch(':id/send')
  @SuccessMessage('Reporte enviado exitosamente')
  send(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.reportService.send(id, req);
  }

  @Can('incidencias', 'validate')
  @Patch(':id/validate')
  @SuccessMessage('Reporte validado exitosamente')
  validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { approved: boolean },
    @Req() req: Request,
  ) {
    return this.reportService.validate(id, dto.approved, req);
  }

  @Can('incidencias', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.reportService.toggleDelete(id, req);
  }
}

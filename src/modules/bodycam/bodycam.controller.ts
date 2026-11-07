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
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { Cam } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { BodycamService } from './bodycam.service';
import { CreateBodycamDto, FilterBodycamDto, UpdateBodycamDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bodycam')
export class BodycamController {
  constructor(private readonly bodycamService: BodycamService) {}

  @Can('bodycam', 'create')
  @Post()
  create(@Body() dto: CreateBodycamDto, @Req() req: Request) {
    return this.bodycamService.create(dto, req);
  }

  @Get()
  findAll(@Query() dto: FilterBodycamDto, @Req() req: Request) {
    return this.bodycamService.findAll(dto, req);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.bodycamService.findOne(id, req);
  }

  @Can('bodycam', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBodycamDto,
    @Req() req: Request,
  ) {
    return this.bodycamService.update(id, dto, req);
  }

  @Can('bodycam', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.bodycamService.toggleDelete(id, req);
  }

  @Can('bodycam', 'create')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { cam: Cam },
    @Req() req: Request,
  ) {
    return this.bodycamService.bulkUpload(dto, file, req);
  }
}

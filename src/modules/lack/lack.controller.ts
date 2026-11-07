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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { LackService } from './lack.service';
import { CreateLackDto, UpdateLackDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { SearchDto } from '../../common/dto';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lack')
export class LackController {
  constructor(private readonly lackService: LackService) {}

  @Can('faltas', 'create')
  @Post()
  create(@Body() dto: CreateLackDto, @Req() req: Request) {
    return this.lackService.create(dto, req);
  }

  @Get()
  findAll(@Query() dto: SearchDto, @Req() req: Request) {
    return this.lackService.findAll(dto, req);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.lackService.findOne(id, req);
  }

  @Can('faltas', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLackDto,
    @Req() req: Request,
  ) {
    return this.lackService.update(id, dto, req);
  }

  @Can('faltas', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.lackService.toggleDelete(id, req);
  }

  @Can('faltas', 'create')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.lackService.bulkUpload(file, req);
  }
}

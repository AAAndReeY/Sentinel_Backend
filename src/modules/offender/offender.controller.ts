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
} from '@nestjs/common';
import { OffenderService } from './offender.service';
import { UpdateOffenderDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';
import { SearchDto } from '../../common/dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offender')
export class OffenderController {
  constructor(private readonly offenderService: OffenderService) {}

  @Post()
  create(@Body() dto: { dni: string }) {
    return this.offenderService.create(dto.dni, true);
  }

  @Get()
  findAll(@Query() dto: SearchDto) {
    return this.offenderService.findAll(dto);
  }

  @Get('subgerencias')
  getSubgerencias() {
    return this.offenderService.getSubgerencias();
  }

  @Get('dni/:dni')
  findDni(@Param('dni') dni: string) {
    return this.offenderService.findDni(dni);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offenderService.findOne(id);
  }

  @Can('offenders', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOffenderDto,
  ) {
    return this.offenderService.update(id, dto);
  }

  @Can('offenders', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.offenderService.delete(id);
  }
}

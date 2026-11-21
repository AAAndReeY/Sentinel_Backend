import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get('*path')
  async getFile(@Param('path') path: string[] | string, @Req() req: any, @Res() res: Response) {
    const filePath = await this.evidenceService.getFile(path, req.user);
    return res.sendFile(filePath);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.evidenceService.delete(id, req.user);
  }
}

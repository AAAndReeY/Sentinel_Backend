import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard, Can, RolesGuard } from 'src/auth/guard';
import { DeactivateSessionDto } from './dto';
import { SuccessMessage } from '../../common/decorators';

@UseGuards(JwtAuthGuard, RolesGuard)
@Can('sesiones', 'edit')
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('deactivate')
  @SuccessMessage('Usuario desactivado exitosamente')
  deactivate(@Body() dto: DeactivateSessionDto) {
    return this.sessionService.deactivate(dto);
  }
}

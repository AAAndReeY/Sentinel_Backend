import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guard';
import { SuccessMessage } from '../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @SuccessMessage('Login exitoso')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.authService.me(req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @SuccessMessage('Logout exitoso')
  logout(@Req() req: Request) {
    return this.authService.logout(req);
  }
}

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
import { UserService } from './user.service';
import { CreateUserDto, FilterUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard, Can, RolesGuard } from '../../auth/guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Can('usuarios', 'create')
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.userService.create(dto, req);
  }

  @Can('usuarios', 'view')
  @Get()
  findAll(@Query() dto: FilterUserDto, @Req() req: Request) {
    return this.userService.findAll(dto, req);
  }

  @Can('usuarios', 'view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.userService.findOne(id, req);
  }

  @Can('usuarios', 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.userService.update(id, dto, req);
  }

  @Can('usuarios', 'delete')
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.userService.toggleDelete(id, req);
  }
}

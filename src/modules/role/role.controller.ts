import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RoleService } from './role.service';
import { Can, JwtAuthGuard, RolesGuard } from '../../auth/guard';
import { SuccessMessage } from '../../common/decorators';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Can('roles', 'view')
  @Get()
  findAll(@Req() req: Request) {
    return this.roleService.findAll(req);
  }

  /** Módulos y acciones que se pueden marcar al editar un rol */
  @Can('roles', 'view')
  @Get('catalog')
  catalog() {
    return this.roleService.catalog();
  }

  /** Roles asignables a un usuario */
  @Can('usuarios', 'view')
  @Get('options')
  options() {
    return this.roleService.options();
  }

  @Can('roles', 'view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.roleService.findOne(id, req);
  }

  @Can('roles', 'create')
  @Post()
  @SuccessMessage('Rol creado exitosamente')
  create(@Body() dto: CreateRoleDto, @Req() req: Request) {
    return this.roleService.create(dto, req);
  }

  @Can('roles', 'edit')
  @Patch(':id')
  @SuccessMessage('Rol actualizado exitosamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    return this.roleService.update(id, dto, req);
  }

  @Can('roles', 'delete')
  @Delete(':id')
  @SuccessMessage('Rol eliminado exitosamente')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.roleService.remove(id, req);
  }
}

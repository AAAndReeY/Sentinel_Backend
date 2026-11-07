import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Action, Model, Rol, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, FilterUserDto, UpdateUserDto } from './dto';
import { buildSelectUser } from './helpers';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { paginationHelper, timezoneHelper } from '../../common/helpers';
import { SessionService } from '../session/session.service';
import { RoleService } from '../role/role.service';

@Injectable()
export class UserService {
  constructor(
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    private readonly roleService: RoleService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto, req: any): Promise<User> {
    const { password, ...res } = dto;
    // Solo el administrador puede asignar roles distintos de Centinela
    if (req.user.rol !== Rol.ADMINISTRATOR && res.rol !== Rol.SENTINEL)
      throw new ForbiddenException('Creación no permitida');
    await this.roleService.assertAssignable(res.rol);
    const user = await this.prisma.user.create({
      data: {
        ...res,
        password: bcrypt.hashSync(password, 10),
        max_ips: 1,
        created_at: timezoneHelper(),
        updated_at: timezoneHelper(),
      },
    });
    await this.auditService.auditCreate(Model.USER, user.id, req);
    return await this.getUserById(user.id);
  }

  async findAll(dto: FilterUserDto, req: any): Promise<any> {
    const { search, ...pagination } = dto;
    const where: any =
      req.user.rol !== Rol.ADMINISTRATOR ? { deleted_at: null } : {};
    if (req.user.rol !== Rol.ADMINISTRATOR) {
      if (dto.rol && dto.rol !== Rol.SENTINEL)
        throw new ForbiddenException('Usuarios no permitidos');
      else dto.rol = Rol.SENTINEL;
    }
    where.rol = dto.rol;
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lastname: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    const users = await paginationHelper(
      this.prisma.user,
      {
        select: buildSelectUser(),
        where,
        orderBy: { lastname: 'asc' },
      },
      pagination,
    );
    await this.sessionService.findAll(users.data);
    await this.auditService.auditGetAll(Model.USER, req);
    return users;
  }

  async findOne(id: string, req: any): Promise<User> {
    const user = await this.getUserById(id, req);
    await this.auditService.auditGetOne(Model.USER, id, req);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, req: any): Promise<User> {
    const { password, ...res } = dto;
    const user = await this.getUserById(id, req);
    if (res.rol) {
      if (req.user.rol !== Rol.ADMINISTRATOR && res.rol !== Rol.SENTINEL)
        throw new ForbiddenException('Operación no permitida');
      await this.roleService.assertAssignable(res.rol);
    }
    const data = password
      ? {
          password: bcrypt.hashSync(password, 10),
          updated_at: timezoneHelper(),
          ...res,
        }
      : { updated_at: timezoneHelper(), ...res };
    await this.prisma.user.update({
      data,
      where: { id },
    });
    await this.auditService.auditUpdate(Model.USER, dto, user, req);
    return await this.getUserById(id, req);
  }

  async toggleDelete(id: string, req: any): Promise<any> {
    const user = await this.getUserById(id, req);
    const inactive = user.deleted_at;
    const deleted_at = inactive ? null : timezoneHelper();
    await this.prisma.user.update({
      data: {
        updated_at: timezoneHelper(),
        deleted_at,
      },
      where: { id },
    });
    if (!inactive) await this.sessionService.deactivateAll(id);
    await this.auditService.auditDelete(Model.USER, id, inactive, req);
    return {
      action: inactive ? Action.RESTORE : Action.DELETE,
      id,
    };
  }
  async getUserById(id: string, req: any = null): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: buildSelectUser(),
    });
    if (
      req &&
      user &&
      req.user.rol !== Rol.ADMINISTRATOR &&
      user.rol !== Rol.SENTINEL
    )
      throw new ForbiddenException('Operación no permitida');
    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (req?.user?.rol !== Rol.ADMINISTRATOR && user.deleted_at)
      throw new BadRequestException('Usuario eliminado');
    return user;
  }
}

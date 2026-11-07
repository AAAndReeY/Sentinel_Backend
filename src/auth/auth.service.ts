import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Action, Model, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto';
import { JwtPayload } from './interfaces';
import { getIP } from '../common/helpers';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import { SessionService } from '../modules/session/session.service';
import { RoleService } from '../modules/role/role.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private auditService: AuditService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private sessionService: SessionService,
    private roleService: RoleService,
  ) {}

  async login(dto: LoginDto, req: Request) {
    const { username, password } = dto;
    const ip = getIP(req);
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        max_ips: true,
        rol: true,
        deleted_at: true,
        name: true,
        lastname: true,
      },
    });
    const auditData = { ip, action: Action.LOGIN, model: Model.AUTH };
    if (!user) {
      await this.auditService.auditAuth({
        ...auditData,
        status: Status.BLOCKED,
        description: 'Usuario no encontrado',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const { id } = user;
    if (user.deleted_at) {
      await this.auditService.auditAuth({
        ...auditData,
        status: Status.BLOCKED,
        description: 'Usuario eliminado',
        user_id: id,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      await this.auditService.auditAuth({
        ...auditData,
        status: Status.FAILED,
        description: 'Contraseña incorrecta',
        user_id: id,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const activeIps = await this.sessionService.getActiveIps(id);
    if (activeIps.includes(ip)) {
      await this.auditService.auditAuth({
        ...auditData,
        status: Status.BLOCKED,
        description: 'Intento de otra sesión con la misma IP',
        user_id: id,
      });
      throw new UnauthorizedException(`Solo se permite una sesión por IP`);
    }
    if (activeIps.length >= user.max_ips) {
      await this.auditService.auditAuth({
        ...auditData,
        status: Status.BLOCKED,
        description: 'Límite de IPs alcanzado',
        user_id: id,
      });
      throw new UnauthorizedException(
        `Se alcanzó el límite de IPs activas permitidas`,
      );
    }
    const token = await this.getJwtToken({ sub: id });
    await this.sessionService.create({ id, ip, token });
    await this.auditService.auditAuth({
      ...auditData,
      status: Status.SUCCESS,
      description: 'Inicio de sesión exitoso',
      user_id: id,
    });
    return {
      user: username,
      rol: user.rol,
      role_name: await this.roleService.getName(user.rol),
      permissions: await this.roleService.permissionsOf(user.rol),
      token,
      nombre: user.name,
      apellido: user.lastname,
    };
  }

  /** Datos de la sesión actual: el front los recarga al abrir la página para tener los permisos al día */
  async me(req: any) {
    const { user_id, rol } = req.user;
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { username: true, name: true, lastname: true },
    });
    return {
      user: user?.username,
      rol,
      role_name: await this.roleService.getName(rol),
      permissions: await this.roleService.permissionsOf(rol),
      nombre: user?.name,
      apellido: user?.lastname,
    };
  }

  async logout(req: any) {
    const { user_id } = req.user;
    const ip = getIP(req);
    await this.sessionService.deactivate({ user_id, ip });
    await this.auditService.auditAuth({
      ip,
      action: Action.LOGOUT,
      model: Model.AUTH,
      status: Status.SUCCESS,
      description: 'Sesión cerrada',
      user_id,
    });
    return { success: true };
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload);
  }
}

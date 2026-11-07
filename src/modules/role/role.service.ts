import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Model } from '@prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import {
  PERMISSION_ACTIONS,
  PERMISSION_CATALOG,
  RolePermissions,
  SUPER_ROLE,
  SYSTEM_ROLES,
  fullPermissions,
} from './permissions';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { timezoneHelper } from '../../common/helpers';

/** Milisegundos que se recuerdan los permisos de un rol antes de volver a leerlos de la base */
const CACHE_TTL_MS = 15_000;

@Injectable()
export class RoleService implements OnModuleInit {
  private readonly logger = new Logger(RoleService.name);
  private cache = new Map<
    string,
    { permissions: RolePermissions; exp: number }
  >();

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /** Crea los roles del sistema que falten. Nunca pisa los permisos que ya se editaron. */
  async onModuleInit() {
    for (const role of SYSTEM_ROLES) {
      const exists = await this.prisma.role.findUnique({
        where: { key: role.key },
      });
      if (exists) continue;
      await this.prisma.role.create({
        data: {
          ...role,
          is_system: true,
          created_at: timezoneHelper(),
          updated_at: timezoneHelper(),
        },
      });
      this.logger.log(`Rol del sistema creado: ${role.key}`);
    }
  }

  catalog() {
    return { modules: PERMISSION_CATALOG, actions: PERMISSION_ACTIONS };
  }

  async findAll(req: any) {
    const [roles, counts] = await Promise.all([
      this.prisma.role.findMany({
        where: { deleted_at: null },
        orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }],
      }),
      this.prisma.user.groupBy({
        by: ['rol'],
        where: { deleted_at: null },
        _count: { _all: true },
      }),
    ]);
    await this.auditService.auditGetAll(Model.ROLE, req);
    return roles.map((role) => ({
      ...this.present(role),
      users: counts.find((c) => c.rol === role.key)?._count._all ?? 0,
    }));
  }

  /** Roles que se pueden asignar a un usuario (para el selector de Usuarios) */
  async options() {
    return await this.prisma.role.findMany({
      select: { key: true, name: true, is_system: true },
      where: { deleted_at: null },
      orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }],
    });
  }

  async findOne(id: string, req: any) {
    const role = await this.getById(id);
    await this.auditService.auditGetOne(Model.ROLE, id, req);
    return this.present(role);
  }

  async create(dto: CreateRoleDto, req: any) {
    const permissions = this.sanitize(dto.permissions ?? {});
    const role = await this.prisma.role.create({
      data: {
        key: await this.uniqueKey(dto.name),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_system: false,
        permissions: permissions as any,
        created_at: timezoneHelper(),
        updated_at: timezoneHelper(),
      },
    });
    await this.auditService.auditCreate(Model.ROLE, role.id, req);
    return this.present(role);
  }

  async update(id: string, dto: UpdateRoleDto, req: any) {
    const role = await this.getById(id);
    if (role.key === SUPER_ROLE && dto.permissions)
      throw new BadRequestException(
        'El Administrador siempre tiene todos los permisos',
      );
    const data: any = { updated_at: timezoneHelper() };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim() || null;
    if (dto.permissions) data.permissions = this.sanitize(dto.permissions);
    await this.prisma.role.update({ data, where: { id } });
    this.cache.delete(role.key);
    // La auditoría guarda texto: los permisos se registran como JSON
    const audited = {
      ...dto,
      permissions: dto.permissions && JSON.stringify(dto.permissions),
    };
    await this.auditService.auditUpdate(
      Model.ROLE,
      audited,
      { ...role, permissions: JSON.stringify(role.permissions) },
      req,
    );
    return this.present(await this.getById(id));
  }

  async remove(id: string, req: any) {
    const role = await this.getById(id);
    if (role.is_system)
      throw new BadRequestException(
        'Los roles del sistema no se pueden eliminar',
      );
    const users = await this.prisma.user.count({
      where: { rol: role.key, deleted_at: null },
    });
    if (users > 0)
      throw new BadRequestException(
        `No se puede eliminar: ${users} ${users === 1 ? 'usuario tiene' : 'usuarios tienen'} este rol. Cámbiales el rol primero.`,
      );
    await this.prisma.role.update({
      data: { deleted_at: timezoneHelper(), updated_at: timezoneHelper() },
      where: { id },
    });
    this.cache.delete(role.key);
    await this.auditService.auditDelete(Model.ROLE, id, null, req);
    return { id };
  }

  /** ¿El rol puede hacer `action` en `module`? Lo usa el guard de cada endpoint. */
  async can(roleKey: string, module: string, action: string): Promise<boolean> {
    const permissions = await this.permissionsOf(roleKey);
    return permissions[module]?.includes(action as any) ?? false;
  }

  /** Permisos vigentes de un rol (con una memoria corta para no consultar la base en cada petición) */
  async permissionsOf(roleKey: string): Promise<RolePermissions> {
    if (roleKey === SUPER_ROLE) return fullPermissions();
    const cached = this.cache.get(roleKey);
    if (cached && cached.exp > Date.now()) return cached.permissions;
    const role = await this.prisma.role.findFirst({
      where: { key: roleKey, deleted_at: null },
    });
    const permissions = (role?.permissions ?? {}) as RolePermissions;
    this.cache.set(roleKey, { permissions, exp: Date.now() + CACHE_TTL_MS });
    return permissions;
  }

  async getName(roleKey: string): Promise<string> {
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    return role?.name ?? roleKey;
  }

  /** Falla si el rol no existe o está eliminado (se usa al asignarlo a un usuario) */
  async assertAssignable(roleKey: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { key: roleKey, deleted_at: null },
    });
    if (!role) throw new BadRequestException('El rol indicado no existe');
  }

  private async getById(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deleted_at: null },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  private present(role: any) {
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      permissions:
        role.key === SUPER_ROLE ? fullPermissions() : role.permissions,
    };
  }

  /** Deja solo módulos y acciones que existen; rechaza lo desconocido */
  private sanitize(input: Record<string, string[]>): RolePermissions {
    const result: RolePermissions = {};
    for (const [module, actions] of Object.entries(input)) {
      const entry = PERMISSION_CATALOG.find((m) => m.key === module);
      if (!entry)
        throw new BadRequestException(`Módulo desconocido: ${module}`);
      if (!Array.isArray(actions))
        throw new BadRequestException(`Acciones inválidas en ${module}`);
      for (const action of actions)
        if (!entry.actions.includes(action as any))
          throw new BadRequestException(
            `La acción "${action}" no existe en ${entry.label}`,
          );
      if (actions.length) result[module] = [...new Set(actions)] as any;
    }
    return result;
  }

  private async uniqueKey(name: string): Promise<string> {
    const base =
      name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30) || 'ROL';
    let key = base;
    for (let i = 2; await this.prisma.role.findUnique({ where: { key } }); i++)
      key = `${base}_${i}`;
    return key;
  }
}

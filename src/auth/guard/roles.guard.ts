import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleService } from '../../modules/role/role.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      targets,
    );
    const permission = this.reflector.getAllAndOverride<[string, string]>(
      'permission',
      targets,
    );
    if (!requiredRoles && !permission) return true;
    const { user } = context.switchToHttp().getRequest();
    if (requiredRoles && !requiredRoles.includes(user.rol)) return false;
    if (permission)
      return this.roleService.can(user.rol, permission[0], permission[1]);
    return true;
  }
}

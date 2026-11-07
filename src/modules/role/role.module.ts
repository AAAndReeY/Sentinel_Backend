import { Global, Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Global: el guard de cada módulo necesita consultar los permisos del rol */
@Global()
@Module({
  controllers: [RoleController],
  providers: [RoleService, AuditService, PrismaService],
  exports: [RoleService],
})
export class RoleModule {}

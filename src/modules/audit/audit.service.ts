import { Injectable } from '@nestjs/common';
import { Action, Audit, Model, Prisma, Status } from '@prisma/client';
import { CreateAuditDto, FilterAuditDto } from './dto';
import { buildAuditSelect } from './helpers';
import { PrismaService } from '../../prisma/prisma.service';
import { paginationHelper, timezoneHelper } from '../../common/helpers';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async auditAuth(dto: CreateAuditDto): Promise<Audit> {
    return await this.prisma.audit.create({
      data: {
        ...dto,
        created_at: timezoneHelper(),
      },
    });
  }

  async auditCreate(
    model: Model,
    register_id: string,
    req: any,
  ): Promise<Audit> {
    return await this.create(
      {
        action: Action.CREATE,
        description: 'Registro creado',
        model,
        register_id,
      },
      req,
    );
  }

  async auditGetAll(model: Model, req: any): Promise<Audit> {
    return await this.create(
      {
        action: Action.GET_ALL,
        description: 'Registros obtenidos',
        model,
      },
      req,
    );
  }

  async auditGetOne(
    model: Model,
    register_id: string,
    req: any,
  ): Promise<Audit> {
    return await this.create(
      {
        action: Action.GET_ONE,
        description: 'Registro obtenido',
        model,
        register_id,
      },
      req,
    );
  }

  async auditUpdate(
    model: Model,
    dto: any,
    register: any,
    req: any,
    db: Pick<Prisma.TransactionClient, 'audit'> = this.prisma,
  ): Promise<void> {
    const asText = (value: unknown) =>
      value == null ? null : typeof value === 'object' ? JSON.stringify(value) : String(value);
    const data = Object.entries(dto).map(([field, value]) => ({
      action: Action.UPDATE,
      description: 'Registro actualizado',
      model,
      register_id: register.id,
      field,
      preview_content: field === 'password' ? null : asText(register[field]),
      new_content: field === 'password' ? null : asText(value),
      ip: req.user.ip,
      status: Status.SUCCESS,
      user_id: req.user.user_id ?? null,
      created_at: timezoneHelper(),
    }));
    if (data.length) await db.audit.createMany({ data });
  }

  async auditDelete(
    model: Model,
    register_id: string,
    inactive: Date | null,
    req: any,
  ): Promise<Audit> {
    return await this.create(
      {
        action: inactive ? Action.RESTORE : Action.DELETE,
        description: inactive ? 'Registro restaurado' : 'Registro eliminado',
        model,
        register_id,
      },
      req,
    );
  }

  async auditSend(id: string, req: any) {
    return await this.create(
      {
        action: Action.SEND,
        description: 'Reporte enviado',
        model: Model.REPORT,
        register_id: id,
      },
      req,
    );
  }

  async auditValidate(id: string, approved: Boolean, req: any) {
    return await this.create(
      {
        action: approved ? Action.APPROVE : Action.REJECT,
        description: approved ? 'Informe aprobado' : 'Informe desaprobado',
        model: Model.REPORT,
        register_id: id,
      },
      req,
    );
  }

  async findAll(dto: FilterAuditDto, req: any) {
    const { search, action, model, status, user, ...pagination } = dto;
    const where: any = { deleted_at: null };
    if (search)
      where.user = { username: { contains: search, mode: 'insensitive' } };
    if (action) where.action = action;
    if (model) where.model = model;
    else where.model = { not: Model.AUDIT };
    if (status) where.status = status;
    if (user) where.user_id = user;
    const audits = await paginationHelper(
      this.prisma.audit,
      {
        select: buildAuditSelect(),
        where,
        orderBy: { created_at: 'desc' },
      },
      pagination,
    );
    await this.auditGetAll(Model.AUDIT, req);
    return audits;
  }

  private async create(
    dto: Omit<CreateAuditDto, 'ip' | 'status'>,
    req: any,
  ): Promise<Audit> {
    return await this.prisma.audit.create({
      data: {
        ...dto,
        ip: req.user.ip,
        status: Status.SUCCESS,
        user_id: req.user.user_id ?? null,
        created_at: timezoneHelper(),
      },
    });
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Action, Jurisdiction, Model, Rol } from '@prisma/client';
import { CreateJurisdictionDto, UpdateJurisdictionDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDto } from '../../common/dto';
import { paginationHelper, timezoneHelper } from '../../common/helpers';

@Injectable()
export class JurisdictionService {
  private select: any = { id: true, name: true, deleted_at: true };

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateJurisdictionDto, req: any): Promise<Jurisdiction> {
    const Jurisdiction = await this.prisma.jurisdiction.create({
      data: {
        ...dto,
        created_at: timezoneHelper(),
        updated_at: timezoneHelper(),
      },
    });
    await this.auditService.auditCreate(
      Model.JURISDICTION,
      Jurisdiction.id,
      req,
    );
    return this.getJurisdictionById(Jurisdiction.id);
  }

  async findAll(dto: SearchDto, req: any): Promise<any> {
    const { rol } = req.user;
    const { search, ...pagination } = dto;
    const where: any = rol !== Rol.ADMINISTRATOR ? { deleted_at: null } : {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const Jurisdictions = await paginationHelper(
      this.prisma.jurisdiction,
      {
        select: this.select,
        where,
        orderBy: { name: 'asc' },
      },
      pagination,
    );
    await this.auditService.auditGetAll(Model.JURISDICTION, req);
    return Jurisdictions;
  }

  async findOne(id: string, req: any): Promise<Jurisdiction> {
    const { rol } = req.user;
    const Jurisdiction = await this.getJurisdictionById(id, rol);
    await this.auditService.auditGetOne(Model.JURISDICTION, id, req);
    return Jurisdiction;
  }

  async update(
    id: string,
    dto: UpdateJurisdictionDto,
    req: any,
  ): Promise<Jurisdiction> {
    const Jurisdiction = await this.getJurisdictionById(id);
    await this.prisma.jurisdiction.update({
      data: {
        ...dto,
        updated_at: timezoneHelper(),
      },
      where: { id },
    });
    await this.auditService.auditUpdate(
      Model.JURISDICTION,
      dto,
      Jurisdiction,
      req,
    );
    return await this.getJurisdictionById(id);
  }

  async toggleDelete(id: string, req: any): Promise<any> {
    const { rol } = req.user;
    const Jurisdiction = await this.getJurisdictionById(id, rol);
    const inactive = Jurisdiction.deleted_at;
    const deleted_at = inactive ? null : timezoneHelper();
    await this.prisma.jurisdiction.update({
      data: {
        updated_at: timezoneHelper(),
        deleted_at,
      },
      where: { id },
    });
    await this.auditService.auditDelete(Model.JURISDICTION, id, inactive, req);
    return {
      action: inactive ? Action.RESTORE : Action.DELETE,
      id,
    };
  }

  async getJurisdictionById(id: string, rol: Rol | null = null): Promise<any> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id },
      select: this.select,
    });
    if (!jurisdiction)
      throw new BadRequestException('Jurisdicción no encontrado');
    if (rol !== Rol.ADMINISTRATOR && jurisdiction.deleted_at)
      throw new BadRequestException('Jurisdicción eliminado');
    return jurisdiction;
  }

  async getJurisdictionsDashboard(): Promise<any> {
    return await this.prisma.jurisdiction.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Busca la jurisdicción por nombre ignorando mayúsculas y tildes
   * (Gestionate escribe "Mariscal Caceres" y Sentinel "Mariscal Cáceres").
   */
  async getByName(name?: string | null): Promise<string | null> {
    if (!name) return null;
    const target = this.normalize(name);
    const jurisdictions = await this.prisma.jurisdiction.findMany({
      select: { id: true, name: true },
      where: { deleted_at: null },
    });
    return jurisdictions.find((j) => this.normalize(j.name) === target)?.id ?? null;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Offender } from '@prisma/client';
import { UpdateOffenderDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDto } from '../../common/dto';
import { ExternalService } from '../../external/external.service';
import { paginationHelper, timezoneHelper } from '../../common/helpers';
import { JurisdictionService } from '../jurisdiction/jurisdiction.service';

@Injectable()
export class OffenderService {
  constructor(
    private readonly external: ExternalService,
    private readonly prisma: PrismaService,
    private jurisdictionService: JurisdictionService,
  ) {}

  async create(dni: string, attendance?: boolean): Promise<any> {
    const offender: Offender | null = await this.getOffenderByDni(dni);
    if (offender) {
      // Si ya existe: registrarlo de nuevo lo marca para asistencia y, si estaba eliminado,
      // lo restaura. Antes se devolvia eliminado y no aparecia en el calendario de inasistencias.
      const data: { attendance?: boolean; deleted_at?: null; updated_at?: Date } = {};
      if (attendance && !offender.attendance) data.attendance = true;
      if (offender.deleted_at) data.deleted_at = null;
      if (Object.keys(data).length === 0) return offender;
      data.updated_at = timezoneHelper();
      return await this.prisma.offender.update({
        data,
        where: { id: offender.id },
      });
    }
    const { email, service_start, ...dto } = await this.verifyPersonal(dni);
    const newOffender = await this.prisma.offender.create({
      data: {
        ...dto,
        attendance: attendance ?? false,
        created_at: timezoneHelper(),
        updated_at: timezoneHelper(),
      },
    });
    return newOffender;
  }

  async findAll(dto: SearchDto): Promise<any> {
    const { search, ...pagination } = dto;
    const where: any = { deleted_at: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    return await paginationHelper(
      this.prisma.offender,
      {
        select: {
          id: true,
          name: true,
          lastname: true,
          dni: true,
          job: true,
          regime: true,
          shift: true,
          subgerencia: true,
        },
        where,
        orderBy: { name: 'asc' },
      },
      pagination,
    );
  }

  async findOne(id: string): Promise<Offender> {
    return await this.getOffenderById(id);
  }

  async update(id: string, dto: UpdateOffenderDto): Promise<Offender> {
    await this.getOffenderById(id);
    await this.prisma.offender.update({
      data: {
        ...dto,
        updated_at: timezoneHelper(),
      },
      where: { id },
    });
    return await this.getOffenderById(id);
  }

  async delete(id: string): Promise<any> {
    await this.getOffenderById(id);
    await this.prisma.offender.update({
      data: {
        updated_at: timezoneHelper(),
        deleted_at: timezoneHelper(),
      },
      where: { id },
    });
  }

  async findDni(dni: string): Promise<any> {
    return await this.verifyPersonal(dni);
  }

  async getSubgerencias(): Promise<string[]> {
    const result = await this.prisma.offender.findMany({
      where: { subgerencia: { not: '' } },
      select: { subgerencia: true },
      distinct: ['subgerencia'],
      orderBy: { subgerencia: 'asc' },
    });
    return result.map(r => r.subgerencia).filter(Boolean);
  }

  private async getOffenderById(id: string): Promise<any> {
    const offender = await this.prisma.offender.findUnique({
      where: { id },
      select: {
        name: true,
        lastname: true,
        dni: true,
        job: true,
        regime: true,
        shift: true,
        subgerencia: true,
        deleted_at: true,
      },
    });
    if (!offender) throw new BadRequestException('Infractor no encontrada');
    if (offender.deleted_at)
      throw new BadRequestException('Infractor eliminada');
    return offender;
  }

  private async getOffenderByDni(dni: string): Promise<any> {
    const offender = await this.prisma.offender.findUnique({
      where: { dni },
    });
    if (!offender) return null;
    return offender;
  }

  async verifyPersonal(dni: string) {
    const personal = await this.external.getExternalUser(dni);
    if (!personal)
      throw new BadRequestException(
        'El personal con ese DNI no se encuentra en el Gestionate',
      );
    return {
      service_start: typeof personal.f_inicio === 'string' ? personal.f_inicio.slice(0, 10) : null,
      gestionate_id: personal.id,
      name: personal.nombres,
      lastname: personal.apellidos,
      dni,
      job: personal.cargo.nombre,
      regime: personal.regimenLaboral.nombre,
      shift: personal.turno.nombre,
      subgerencia: personal.subgerencia.nombre,
      jurisdiction_id: await this.jurisdictionService.getByName(
        personal.jurisdiccion?.nombre,
      ),
      email: personal.correo,
    };
  }
}

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
    const offender = await this.getOffenderByDni(dni);
    if (offender) {
      if (attendance)
        await this.prisma.offender.update({
          data: { attendance },
          where: { id: offender.id },
        });
      return offender;
    }
    const dto = await this.verifyPersonal(dni);
    delete dto.email;
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

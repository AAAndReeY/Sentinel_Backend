import { BadRequestException, Injectable } from '@nestjs/common';
import { Action, Cam, Model, Process, Report, Rol } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import * as handlebars from 'handlebars';
import * as ExcelJS from 'exceljs';
import { CreateReportDto, FilterReportDto, UpdateReportDto } from './dto';
import {
  buildSelectReport,
  describeMedia,
  mediaLabel,
  ReportMedium,
} from './helpers';
import { validatorScope, ReportReader } from './helpers/validator-scope';
import { nextReportCode } from './helpers/next-report-code';
import { ReportGateway } from './report.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BodycamService } from '../bodycam/bodycam.service';
import { EvidenceService } from '../evidence/evidence.service';
import { LackService } from '../lack/lack.service';
import { OffenderService } from '../offender/offender.service';
import { SubjectService } from '../subject/subject.service';
import { UserService } from '../user/user.service';
import {
  dateString,
  getShift,
  paginationHelper,
  timezoneHelper,
  verifyUpdateFiles,
} from '../../common/helpers';

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ReportGateway,
    private readonly auditService: AuditService,
    private readonly bodycamService: BodycamService,
    private readonly evidenceService: EvidenceService,
    private readonly lackService: LackService,
    private readonly offenderService: OffenderService,
    private readonly subjectSubject: SubjectService,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateReportDto, req: any) {
    const { user_id } = req.user;
    const media = await this.resolveMedia(dto.media, dto.bodycam_id);
    // Dispositivo principal: el indicado o el primero de la lista (se mantiene para Excel y plantillas)
    const bodycam_id =
      dto.bodycam_id ?? media.find((m) => m.id)?.id ?? undefined;
    const bodycam = bodycam_id
      ? await this.bodycamService.getBodycamById(bodycam_id)
      : null;
    const lack = await this.lackService.getLackById(dto.lack_id);
    const subject = await this.subjectSubject.getSubjectById(dto.subject_id);
    const user = await this.userService.getUserById(user_id, req);
    const offender = await this.offenderService.create(dto.offender_dni);
    const cameraman =
      dto.bodycam_dni && dto.bodycam_dni !== dto.offender_dni
        ? await this.offenderService.verifyPersonal(dto.bodycam_dni)
        : offender;
    const bodycam_user = dto.bodycam_dni
      ? `${cameraman.lastname} ${cameraman.name}`
      : null;
    const { date: dates, time } = dateString(new Date(dto.date));
    const compile = handlebars.compile(lack.content);
    // Con varios medios, {{bodycam.name}} de las plantillas existentes nombra a todos:
    // "SG004, la CÁMARA 104A y un CELULAR". {{medios}} da la frase completa.
    const others = media.filter((m) => !bodycam || m.id !== bodycam.id);
    const bodycamForText =
      bodycam && others.length
        ? { ...bodycam, name: describeMediaAfter(bodycam.name, others) }
        : bodycam;
    const identification = {
      reported_name: dto.reported_name ?? offender.name,
      reported_lastname: dto.reported_lastname ?? offender.lastname,
      reported_dni: dto.reported_dni ?? offender.dni,
      reported_job: dto.reported_job ?? offender.job,
      reported_regime: dto.reported_regime ?? offender.regime,
    };
    const message = compile({
      ...dto,
      bodycam: bodycamForText,
      bodycam_user,
      media,
      medios: describeMedia(media),
      lack,
      dates,
      offender: { ...offender,
        name: identification.reported_name,
        lastname: identification.reported_lastname,
        dni: identification.reported_dni,
        job: identification.reported_job,
        regime: identification.reported_regime,
      },
      subject,
      time,
      user,
    });
    const { header, bodycam_dni, offender_dni, media: _media, ...res } = dto;
    const { id } = await this.prisma.report.create({
      data: {
        ...res,
        ...identification,
        bodycam_id,
        media: media.length ? (media as any) : undefined,
        bodycam_user,
        header: instanceToPlain(header),
        message,
        shift: getShift(res.date),
        offender_id: offender.id,
        user_id,
        created_at: timezoneHelper(),
        updated_at: timezoneHelper(),
      },
    });
    await this.auditService.auditCreate(Model.REPORT, id, req);
    return { id, message };
  }

  async findAll(dto: FilterReportDto, req: any): Promise<any> {
    const { rol } = req.user;
    const { search, jurisdiction, lack, process, shift, subject, subgerencia, ...pagination } = dto;
    const where: any = rol !== Rol.ADMINISTRATOR ? { deleted_at: null } : {};
    const orderBy: any = [{ created_at: 'desc' }];
    if (rol === 'VALIDATOR') {
      where.AND = [validatorScope(req.user)];
      orderBy.unshift({ process: 'asc' });
    }
    if (search) where.OR = this.searchIdentity(search);
    if (lack) where.lack_id = lack;
    if (jurisdiction) where.jurisdiction_id = jurisdiction;
    if (process) where.process = process;
    if (shift) where.shift = shift;
    if (subject) where.subject_id = subject;
    if (subgerencia) {
      if (!where.offender) where.offender = {};
      where.offender.subgerencia = { contains: subgerencia, mode: 'insensitive' };
    }
    const reports = await paginationHelper(
      this.prisma.report,
      {
        select: buildSelectReport({ relations: true }),
        where,
        orderBy,
      },
      pagination,
    );
    await this.auditService.auditGetAll(Model.REPORT, req);
    return reports;
  }

  async findOne(id: string, req: any): Promise<Report> {
    const { rol } = req.user;
    const report = await this.getReportById(id, req.user);
    await this.auditService.auditGetOne(Model.REPORT, id, req);
    return report;
  }

  async update(
    id: string,
    dto: UpdateReportDto,
    files: Array<Express.Multer.File>,
    descriptions: string[] | string,
    req: any,
  ): Promise<Report> {
    const { rol } = req.user;
    const report = await this.getReportById(id, req.user);
    if (rol === Rol.VALIDATOR && !report.process)
      throw new BadRequestException(
        'El informe aún no fue enviado, usted no puede actualizar',
      );

    if (report.process) {
      if (rol === Rol.SENTINEL)
        throw new BadRequestException(
          'El informe ya fue enviado, usted no puede actualizar',
        );

      if (rol === Rol.VALIDATOR && report.process !== Process.PENDING)
        throw new BadRequestException(
          'El informe ya fue validado, usted no puede actualizar',
        );
    }
    if (dto.bodycam_id)
      await this.bodycamService.getBodycamById(dto.bodycam_id);
    if (dto.subject_id)
      await this.subjectSubject.getSubjectById(dto.subject_id);
    if (dto.lack_id) await this.lackService.getLackById(dto.lack_id);
    const media = dto.media
      ? await this.resolveMedia(dto.media, dto.bodycam_id)
      : null;
    const { header, bodycam_dni, offender_dni, media: _media, ...res } = dto;
    await this.prisma.report.update({
      data: {
        ...res,
        ...(media ? { media: media as any } : {}),
        updated_at: timezoneHelper(),
      },
      where: { id },
    });
    verifyUpdateFiles(files, descriptions, report.evidences);
    if (files.length)
      await this.evidenceService.create(files, descriptions, id);
    await this.auditService.auditUpdate(Model.REPORT, dto, report, req);
    return await this.getReportById(id, req.user);
  }

  async toggleDelete(id: string, req: any): Promise<any> {
    const { rol } = req.user;
    const report = await this.getReportById(id, req.user);
    const inactive = report.deleted_at;
    const deleted_at = inactive ? null : timezoneHelper();
    await this.prisma.report.update({
      data: {
        updated_at: timezoneHelper(),
        deleted_at,
      },
      where: { id },
    });
    await this.auditService.auditDelete(Model.REPORT, id, inactive, req);
    return {
      action: inactive ? Action.RESTORE : Action.DELETE,
      id,
    };
  }

  async send(id: string, req: any): Promise<any> {
    const report = await this.getReportById(id, req.user);
    if (report.evidences.length === 0)
      throw new BadRequestException('El informe debe presentar evidencias');
    if (report.process)
      throw new BadRequestException('El informe ya ha sido enviado');
    const updated = await this.prisma.report.update({
      data: {
        process: Process.PENDING,
        updated_at: timezoneHelper(),
      },
      where: { id },
      select: buildSelectReport({ relations: true }),
    });
    this.gateway.emitReportStatusChanged(updated);
    await this.auditService.auditSend(id, req);
    return { id };
  }

  async validate(id: string, approved: Boolean, req: any): Promise<any> {
    const report = await this.getReportById(id, req.user);
    if (!report.process)
      throw new BadRequestException('El informe aún no se ha enviado');
    if (report.process !== Process.PENDING)
      throw new BadRequestException('El informe ya fue validado');
    const updated = await this.prisma.$transaction(async tx => {
      const code = approved ? await nextReportCode(tx, 4) : null;
      const result = await tx.report.updateMany({
        where: { id, process: Process.PENDING, deleted_at: null, AND: validatorScope(req.user) },
        data: {
          code,
          process: approved ? Process.APPROVED : Process.REJECTED,
          updated_at: timezoneHelper(),
        },
      });
      if (!result.count) throw new BadRequestException('El informe ya no está pendiente de validación');
      return { id, code };
    });
    this.gateway.emitReportStatusValidate(updated);
    await this.auditService.auditValidate(id, approved, req);
    return { id, state: approved, code: updated.code };
  }

  // FIXED: Deprecated
  async getByRange(dto: FilterReportDto, req: any) {
    const { lack, start, end } = dto;
    if (!lack || !start || !end)
      throw new BadRequestException('Es necesario enviar el rango y la falta');
    await this.lackService.getLackById(lack);
    const date_start = new Date(`${start}T00:00:00.000Z`);
    const date_end = new Date(`${end}T23:59:59.999Z`);
    const reports = await this.prisma.report.findMany({
      where: {
        lack_id: lack,
        date: {
          gte: date_start,
          lte: date_end,
        },
      },
      select: { date: true, offender: true, offender_id: true },
      orderBy: { date: 'asc' },
    });
    const response: any = [];
    for (const report of reports) {
      const offender_id = report.offender_id;
      if (!report.offender) continue;
      const match = response.find((r) => r.id === offender_id);
      const date = report.date.toISOString().split('T')[0];
      if (match) {
        match.dates.push(date);
        continue;
      }
      const { id, name, lastname, dni, job, regime, shift } = report.offender;
      response.push({
        id,
        name,
        lastname,
        dni,
        job,
        regime,
        shift,
        dates: [date],
      });
    }
    await this.auditService.auditGetAll(Model.REPORT, req);
    return response;
  }

  async exportExcel(dto: FilterReportDto, req: any): Promise<Buffer> {
    const { rol } = req.user;
    const { search, jurisdiction, lack, process, shift, subject, subgerencia } = dto;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const shiftLabel = (s: string) =>
      s === 'M' ? 'Mañana' : s === 'T' ? 'Tarde' : s === 'N' ? 'Noche' : s || '';

    const processLabel = (p: string | null) =>
      p === 'PENDING' ? 'Pendiente' : p === 'APPROVED' ? 'Aprobado' : p === 'REJECTED' ? 'Rechazado' : 'Borrador';

    const modeLabel = (m: string) =>
      m === 'JUSTIFIED' ? 'Justificada' : m === 'UNJUSTIFIED' ? 'Injustificada' : '-';

    const diffDays = (s: Date, e: Date) =>
      Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));

    const fmtDate = (d: Date | string) =>
      new Date(d).toISOString().substring(0, 10).split('-').reverse().join('/');

    // ── Filtros ───────────────────────────────────────────────────────────────
    const whereReports: any = { deleted_at: null };
    if (rol === 'VALIDATOR') whereReports.AND = [validatorScope(req.user)];
    if (search) whereReports.OR = this.searchIdentity(search);
    if (lack) whereReports.lack_id = lack;
    if (jurisdiction) whereReports.jurisdiction_id = jurisdiction;
    if (process) whereReports.process = process;
    if (shift) whereReports.shift = shift;
    if (subject) whereReports.subject_id = subject;
    if (subgerencia) {
      if (!whereReports.offender) whereReports.offender = {};
      whereReports.offender.subgerencia = { contains: subgerencia, mode: 'insensitive' };
    }

    const reports = await this.prisma.report.findMany({
      select: buildSelectReport({ relations: true }),
      where: whereReports,
      orderBy: [{ created_at: 'desc' }],
    });

    // ── Filas intermedias (con flag isAbsence) ────────────────────────────────
    const intermediate = reports.map((r: any) => {
      const absence = r.absences?.[0] ?? null;
      const cc: string[] = ((r.header as any)?.cc || []).map((c: any) => c.name).filter(Boolean);
      const isAbsence = (r.absences?.length > 0) || (r.lack?.name === 'Inasistencia');
      const tipoMedio =
        mediaLabel(r.media) ||
        (r.bodycam ? 'Bodycam' : 'Reporte');
      const inasistenciaTipo = isAbsence
        ? (absence?.mode ? modeLabel(absence.mode) : (r.lack?.name || '-'))
        : '';

      return {
        isAbsence,
        base: [
          r.code || '-',
          r.reported_dni ?? r.offender?.dni ?? '',
          r.offender ? `${r.reported_name ?? r.offender.name} ${r.reported_lastname ?? r.offender.lastname}`.trim() : '',
          r.offender?.subgerencia || '',
          r.reported_job ?? r.offender?.job ?? '',
          r.reported_regime ?? r.offender?.regime ?? '',
          r.subject?.name || '',
          r.lack?.name || '',
          shiftLabel(r.shift),
          r.date ? fmtDate(r.date) : '',
          r.date ? r.date.toISOString().substring(11, 16) : '',
          r.jurisdiction?.name || '',
          tipoMedio,
          r.bodycam?.name || '-',
          r.bodycam_user || '-',
          r.address || '',
          (r.header as any)?.to?.name || '',
          (r.header as any)?.to?.job || '',
          cc.length ? cc.join(', ') : '-',
          processLabel(r.process),
          r.evidences?.length ?? 0,
          r.link ? r.link.split('\n')[0].trim() : '',
        ],
        absence: [
          inasistenciaTipo,
          isAbsence && absence?.start ? fmtDate(absence.start) : '',
          isAbsence && absence?.end ? fmtDate(absence.end) : '',
          isAbsence && absence?.start && absence?.end
            ? diffDays(new Date(absence.start), new Date(absence.end))
            : '',
        ],
        registradoPor: r.user ? `${r.user.name} ${r.user.lastname}`.trim() : '',
      };
    });

    // ── Decidir si el export es exclusivamente de inasistencias ─────────────
    // Si todos los registros son inasistencias → modo inasistencia (columnas extra)
    // Si hay mezcla o ninguna → excluir inasistencias del export (columnas incompatibles)
    const allAbsences = intermediate.length > 0 && intermediate.every(r => r.isAbsence);
    const exportRows = allAbsences
      ? intermediate                              // solo inasistencias → incluir todas
      : intermediate.filter(r => !r.isAbsence);  // mixto/general → excluir inasistencias

    const baseColumns = [
      'Código', 'DNI Infractor', 'Nombre Infractor', 'Subgerencia', 'Cargo',
      'Régimen Laboral', 'Asunto', 'Falta', 'Turno', 'Fecha Incidente',
      'Hora Incidente', 'Jurisdicción', 'Tipo de Medio', 'Bodycam', 'Asignada A',
      'Dirección', 'Dirigido A', 'Cargo Destinatario', 'Con Copia A', 'Estado',
      'Evidencias', 'Link',
    ];
    const absenceColumns = ['Inasistencia: Tipo', 'Inasistencia: Desde', 'Inasistencia: Hasta', 'Inasistencia: Días'];
    const columns = allAbsences
      ? [...baseColumns, ...absenceColumns, 'Registrado Por']
      : [...baseColumns, 'Registrado Por'];

    const dataRows = exportRows.map(r =>
      allAbsences
        ? [...r.base, ...r.absence, r.registradoPor]
        : [...r.base, r.registradoPor],
    );

    // ── ExcelJS ───────────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Centinela';
    const ws = workbook.addWorksheet('Incidencias', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Estilo header
    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const headerAlignment: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: false };
    const borderStyle: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFBFBFBF' } };
    const cellBorder: Partial<ExcelJS.Borders> = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

    // Fila de encabezado
    const headerRow = ws.addRow(columns);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = headerAlignment;
      cell.border = cellBorder;
    });

    // Índice de la columna "Link" (base-1)
    const linkColIdx = columns.indexOf('Link') + 1;

    // Filas de datos
    dataRows.forEach((rowData, i) => {
      const row = ws.addRow(rowData);
      const isEven = i % 2 === 1;
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };
        }
        // Hipervínculo en columna Link
        if (colIdx === linkColIdx) {
          const url = rowData[linkColIdx - 1] as string;
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            cell.value = { text: url, hyperlink: url };
            cell.font = { color: { argb: 'FF1155CC' }, underline: true };
          }
        }
      });
    });

    // AutoFilter en todas las columnas
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    // Anchos de columna automáticos
    columns.forEach((header, i) => {
      const colData = dataRows.map(r => String(r[i] ?? ''));
      const maxLen = Math.max(header.length, ...colData.map(v => v.length));
      ws.getColumn(i + 1).width = Math.min(maxLen + 3, 50);
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private searchIdentity(search: string) {
    const contains = { contains: search, mode: 'insensitive' as const };
    return [
      { code: contains },
      ...['dni', 'name', 'lastname'].flatMap(field => [
        { ['reported_' + field]: contains },
        { ['reported_' + field]: null, offender: { [field]: contains } },
      ]),
    ];
  }

  private async getReportById(
    id: string,
    options?: ReportReader & {
      relation?: Boolean;
    },
  ): Promise<any> {
    const { rol = null, relation = true } = options || {};
    const select = relation ? { relations: true } : { ids: true };
    const report = await this.prisma.report.findUnique({
      where: { id, AND: validatorScope(options || {}) },
      select: buildSelectReport(select),
    });
    if (!report) throw new BadRequestException('Informe no encontrado');
    if (rol !== Rol.ADMINISTRATOR && report.deleted_at)
      throw new BadRequestException('Informe eliminado');
    return report;
  }

  /**
   * Valida los medios enviados y les agrega el nombre del dispositivo. Sin lista, usa bodycam_id.
   * Quita repetidos; el celular no tiene dispositivo.
   */
  private async resolveMedia(
    media: { cam: Cam; bodycam_id?: string }[] | undefined,
    bodycamId?: string,
  ): Promise<ReportMedium[]> {
    const items = media?.length
      ? media
      : bodycamId
        ? [{ cam: Cam.BODYCAM, bodycam_id: bodycamId }]
        : [];
    const result: ReportMedium[] = [];
    for (const item of items) {
      if (item.cam === Cam.PHONE && !item.bodycam_id) {
        if (!result.some((m) => m.cam === Cam.PHONE))
          result.push({ cam: Cam.PHONE, id: null, name: null });
        continue;
      }
      if (!item.bodycam_id)
        throw new BadRequestException(
          'Selecciona el dispositivo de cada medio (bodycam, cámara o radio)',
        );
      if (result.some((m) => m.id === item.bodycam_id)) continue;
      const device = await this.bodycamService.getBodycamById(item.bodycam_id);
      result.push({ cam: device.cam, id: device.id, name: device.name });
    }
    return result;
  }
}

/** "SG004" + otros medios -> "SG004, la CÁMARA 104A y un CELULAR" */
function describeMediaAfter(firstName: string, others: ReportMedium[]): string {
  const rest = describeMedia(others);
  return others.length > 1 ? `${firstName}, ${rest}` : `${firstName} y ${rest}`;
}

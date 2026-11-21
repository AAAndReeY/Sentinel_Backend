import { Injectable } from '@nestjs/common';
import { CreateAbsenceDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { instanceToPlain } from 'class-transformer';
import { timezoneHelper } from '../../common/helpers';
import { nextReportCode } from '../report/helpers/next-report-code';
import { Absence, Process } from '@prisma/client';

@Injectable()
export class AbsenceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAbsenceDto, req: any): Promise<Absence> {
    const { user_id } = req.user;
    const { header, lack_id, subject_id, ...res } = dto;
    return this.prisma.$transaction(async tx => {
      const code = await nextReportCode(tx, 3);
      const report = await tx.report.create({
        data: {
          code,
          header: instanceToPlain(header),
          date: timezoneHelper(),
          process: Process.APPROVED,
          lack_id,
          subject_id,
          user_id,
          created_at: timezoneHelper(),
          updated_at: timezoneHelper(),
        },
      });
      const start = `${res.start}T08:00:00.000Z`;
      const end = `${res.end}T08:00:00.000Z`;
      return await tx.absence.create({
        data: {
          start,
          end,
          mode: res.mode,
          report_id: report.id,
          created_at: timezoneHelper(),
          updated_at: timezoneHelper(),
        },
      });
    });
  }
}

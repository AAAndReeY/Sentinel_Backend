import { Prisma } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { ReportReader, validatorScope } from '../report/helpers/validator-scope';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateDirectory,
  generateFilename,
  getResolvedFilePath,
  timezoneHelper,
} from '../../common/helpers';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // La actualización del informe serializa las cargas concurrentes del mismo borrador.
  async attach(tx: Prisma.TransactionClient, files: Express.Multer.File[], descriptions: string[],
    reportId: string, written: string[]): Promise<string[]> {
    const existing = await tx.evidence.findMany({ where: { report_id: reportId, deleted_at: null } });
    const ids: string[] = [];
    const base = this.config.getOrThrow<string>('FILES_PATH');
    const { currentDate, uploadDir, date } = generateDirectory(this.config);
    for (const [i, file] of files.entries()) {
      const description = descriptions[i].trim();
      let found: string | undefined;
      for (const entry of existing) {
        if (entry.size !== file.size || entry.description.trim() !== description) continue;
        try {
          const stored = await fs.promises.readFile(path.join(base, entry.path));
          if (stored.equals(file.buffer)) { found = entry.id; break; }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      if (found) { ids.push(found); continue; }
      if (existing.length >= 5) throw new BadRequestException('Solo puedes subir 5 archivos como máximo');
      const name = generateFilename(file.originalname);
      const dest = path.join(uploadDir, name);
      await fs.promises.writeFile(dest, file.buffer);
      written.push(dest);
      const entry = await tx.evidence.create({ data: {
        report_id: reportId, description, path: `evidence/${currentDate}/${name}`,
        mimetype: file.mimetype, size: file.size, created_at: date, updated_at: date,
      } });
      existing.push(entry);
      ids.push(entry.id);
    }
    return ids;
  }

  async getFile(path: string[] | string, user: ReportReader): Promise<string> {
    if (user.rol === 'VALIDATOR') {
      const file = await this.prisma.evidence.findFirst({
        where: { path: 'evidence/' + (Array.isArray(path) ? path.join('/') : path),
          deleted_at: null, report: validatorScope(user) },
        select: { id: true },
      });
      if (!file) throw new NotFoundException('Archivo no disponible');
    }
    return getResolvedFilePath(this.config, path);
  }

  async delete(id: string, user: ReportReader) {
    await this.getEvidenceById(id);
    await this.prisma.evidence.update({
      data: {
        updated_at: timezoneHelper(),
        deleted_at: timezoneHelper(),
      },
      where: { id, report: validatorScope(user) },
    });
  }

  private async getEvidenceById(id: string): Promise<any> {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
    });
    if (!evidence) throw new BadRequestException('Archivo no encontrado');
    if (evidence.deleted_at) throw new BadRequestException('Archivo eliminado');
    return evidence;
  }
}

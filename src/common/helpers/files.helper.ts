import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Evidence } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { timezoneHelper } from './timezone.helper';

export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  return `${randomUUID()}${ext}`;
}

export function generateDirectory(configService: ConfigService): any {
  const basePath = getBasePath(configService);
  const date = timezoneHelper();
  const currentDate = date.toISOString().split('T')[0];
  const uploadDir = path.join(basePath, 'evidence', currentDate);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return { currentDate, uploadDir, date };
}

export function getResolvedFilePath(
  configService: ConfigService,
  dynamicPath: string[] | string,
): string {
  const basePath = getBasePath(configService);
  const sanitizedPath = Array.isArray(dynamicPath)
    ? path.join(...dynamicPath)
    : dynamicPath.replace(/^\/+/, '');
  const fullPath = path.resolve(basePath, 'evidence', sanitizedPath);
  if (!fs.existsSync(fullPath))
    throw new NotFoundException(`Archivo no encontrado: ${sanitizedPath}`);
  return fullPath;
}

export function verifyUpdateFiles(
  files: Array<Express.Multer.File>,
  descriptions: string[] | string,
  evidences: Evidence[],
): void {
  if (!files || files.length === 0) return;
  const total = evidences.length + files.length;
  if (total > 5)
    throw new ForbiddenException('Solo puedes subir 5 archivos como máximo');
  if (!Array.isArray(descriptions))
    throw new BadRequestException('El campo descriptions ser un arreglo');
  if (descriptions.length !== files.length)
    throw new BadRequestException(
      'La cantidad de descripciones no coincide con la cantidad de archivos',
    );
  const hasEmpty = descriptions.some((d) => !d || !d.trim());
  if (hasEmpty)
    throw new BadRequestException(
      'Todas las descripciones deben contener texto',
    );
}

function getBasePath(configService: ConfigService): string {
  const basePath = configService.get<string>('FILES_PATH');
  if (!basePath)
    throw new InternalServerErrorException('Variable interna no definida');
  return basePath;
}

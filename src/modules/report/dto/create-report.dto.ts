import { Cam } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class RecipientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  job: string;
}

class MediumDto {
  @IsEnum(Cam, { message: 'Tipo de medio no valido' })
  cam: Cam;

  /** Dispositivo registrado (Bodycam.id); no se envia para celular */
  @IsOptional()
  @IsUUID()
  bodycam_id?: string;
}

class HeaderDto {
  @IsObject({ message: 'El campo to debe ser un objeto válido.' })
  @ValidateNested()
  @Type(() => RecipientDto)
  to: RecipientDto;

  @IsArray({ message: 'El campo cc debe ser un arreglo válido' })
  @ArrayMinSize(1, { message: 'Debe haber al menos un destinatario en cc' })
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  cc: RecipientDto[];
}

export class CreateReportDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reported_name?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reported_lastname?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^[0-9]{8}$/)
  reported_dni?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reported_job?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reported_regime?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? null : value)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  service_start?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assigned_zone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assigned_sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assigned_radio?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HeaderDto)
  header: HeaderDto;

  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @Matches(/^[0-9]{8}$/)
  bodycam_dni?: string;

  @IsOptional()
  @IsString()
  bodycam_supervisor?: string;

  @Matches(/^[0-9]{8}$/)
  offender_dni: string;

  @IsUUID()
  @IsOptional()
  bodycam_id?: string;

  /** Uno o varios medios (bodycam, camara, radio, celular). bodycam_id queda como el principal. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediumDto)
  media?: MediumDto[];

  @IsUUID()
  @IsNotEmpty()
  jurisdiction_id: string;

  @IsUUID()
  @IsNotEmpty()
  lack_id: string;

  @IsUUID()
  @IsNotEmpty()
  subject_id: string;
}

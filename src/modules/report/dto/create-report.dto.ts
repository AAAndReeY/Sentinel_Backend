import { Cam } from '@prisma/client';
import { Type } from 'class-transformer';
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

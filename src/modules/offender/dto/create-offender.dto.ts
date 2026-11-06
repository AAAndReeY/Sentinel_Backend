import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateOffenderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @Matches(/^[0-9]{8}$/)
  dni: string;

  @IsString()
  @IsNotEmpty()
  gestionate_id: string;

  @IsString()
  @IsNotEmpty()
  job: string;

  @IsString()
  @IsNotEmpty()
  shift: string;

  @IsString()
  @IsNotEmpty()
  regime: string;

  @IsString()
  @IsNotEmpty()
  subgerencia: string;

  @IsBoolean()
  @IsOptional()
  attendance?: boolean;
}

import { IsBoolean, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class ValidateReportDto {
  @IsBoolean()
  approved: boolean;

  @ValidateIf(dto => dto.approved === false)
  @IsString()
  @Matches(/\S/, { message: 'Escribe la observación del rechazo' })
  @MaxLength(2000)
  rejection_reason?: string;
}

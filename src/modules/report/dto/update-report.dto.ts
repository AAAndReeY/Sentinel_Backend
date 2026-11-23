import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  captions?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

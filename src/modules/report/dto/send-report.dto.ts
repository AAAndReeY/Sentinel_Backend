import { IsIn } from 'class-validator';
import { validatorDepartments } from '../helpers/validator-scope';

export class SendReportDto {
  @IsIn(validatorDepartments, { message: 'Selecciona la subgerencia de destino' })
  destination_department: string;
}

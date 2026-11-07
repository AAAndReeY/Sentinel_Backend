import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  description?: string;

  /** { modulo: [acciones] }; se valida contra el catálogo en el servicio */
  @IsObject()
  @IsOptional()
  permissions?: Record<string, string[]>;
}

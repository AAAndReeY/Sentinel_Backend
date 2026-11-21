import { Prisma, Rol } from '@prisma/client';

const departments = {
  SERENAZGO: ['Serenazgo'],
  FISCALIZACION: ['Fiscalización', 'Fiscalizacion', 'Fiscalización y Sanciones Administrativas', 'Fiscalizacion y Sanciones Administrativas'],
  TRANSPORTE: ['Transporte', 'Transportes', 'Movilidad Urbana y Transitabilidad', 'Movilidad Urbana y Transitibilidad'],
};

export const validatorDepartments = Object.keys(departments);

export interface ReportReader {
  rol?: string | null;
  validator_department?: string | null;
}

export function validatorScope(user: ReportReader): Prisma.ReportWhereInput {
  if (user.rol !== Rol.VALIDATOR) return {};
  const key = user.validator_department;
  const names = key && Object.prototype.hasOwnProperty.call(departments, key)
    ? departments[key as keyof typeof departments] : [];
  return {
    deleted_at: null,
    process: { not: null },
    offender: { subgerencia: { in: names.flatMap(name => [name, 'Subgerencia de ' + name]), mode: 'insensitive' } },
  };
}

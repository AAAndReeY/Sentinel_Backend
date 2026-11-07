import { SetMetadata } from '@nestjs/common';

/** Exige que el rol del usuario tenga el permiso `accion` sobre `modulo` (ver modules/role/permissions.ts) */
export const Can = (module: string, action: string) =>
  SetMetadata('permission', [module, action]);

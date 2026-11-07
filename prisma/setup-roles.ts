/**
 * Prepara la base de datos para los roles editables.
 *
 * Se corre UNA vez en cada servidor, desde la carpeta del backend y antes de reiniciarlo:
 *
 *   npx ts-node prisma/setup-roles.ts
 *
 * Es seguro repetirlo. Hace tres cosas:
 *   1. Convierte la columna User.rol de enum a texto (Prisma no puede hacerlo solo).
 *   2. Ejecuta `prisma db push`: crea la tabla Role y el valor ROLE de Model, y regenera el cliente.
 *   3. Crea los 5 roles del sistema (con sus permisos por defecto) si todavía no existen.
 *      Los roles que ya existen no se tocan, así que no pisa permisos editados.
 */
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { SYSTEM_ROLES } from '../src/modules/role/permissions';

async function convertUserRolToText() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<{ data_type: string }[]>`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'rol'`;
    if (rows[0]?.data_type === 'USER-DEFINED') {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "User" ALTER COLUMN "rol" TYPE TEXT USING "rol"::TEXT',
      );
      console.log('1/3 User.rol convertida de enum a texto');
    } else {
      console.log('1/3 User.rol ya es texto (nada que hacer)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

function pushSchema() {
  console.log('2/3 Ejecutando prisma db push...');
  execSync('npx prisma db push', { stdio: 'inherit' });
}

async function seedSystemRoles() {
  const prisma = new PrismaClient();
  try {
    for (const role of SYSTEM_ROLES) {
      const exists = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Role" WHERE key = ${role.key}`;
      if (exists.length > 0) {
        console.log(`    ${role.key}: ya existe`);
        continue;
      }
      await prisma.$executeRaw`
        INSERT INTO "Role" (id, key, name, description, is_system, permissions, created_at, updated_at)
        VALUES (${randomUUID()}, ${role.key}, ${role.name}, ${role.description}, true,
                ${JSON.stringify(role.permissions)}::jsonb, NOW(), NOW())`;
      console.log(`    ${role.key}: creado`);
    }

    // Aviso: usuarios cuyo rol no existe en la tabla (no deberían quedar)
    const orphans = await prisma.$queryRaw<{ rol: string; total: bigint }[]>`
      SELECT u.rol, COUNT(*) AS total FROM "User" u
      LEFT JOIN "Role" r ON r.key = u.rol AND r.deleted_at IS NULL
      WHERE r.id IS NULL GROUP BY u.rol`;
    if (orphans.length > 0)
      console.warn(
        '    ATENCIÓN: hay usuarios con un rol que no existe:',
        orphans.map((o) => `${o.rol} (${o.total})`).join(', '),
      );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await convertUserRolToText();
  pushSchema();
  console.log('3/3 Creando los roles del sistema...');
  await seedSystemRoles();
  console.log('Listo. Ya puedes reiniciar el backend.');
}

main().catch((error) => {
  console.error('Falló la preparación de roles:', error);
  process.exit(1);
});

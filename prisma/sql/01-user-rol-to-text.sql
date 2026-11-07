-- Roles editables: la columna User.rol pasa de enum a texto (guarda la clave de un rol de la tabla Role).
-- Prisma no puede convertirla solo, por eso se hace a mano ANTES de `npx prisma db push`.
-- Es seguro repetirlo: si la columna ya es texto, no hace nada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'rol' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "rol" TYPE TEXT USING "rol"::TEXT;
  END IF;
END $$;

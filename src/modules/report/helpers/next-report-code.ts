import { Prisma } from '@prisma/client';
import { getCurrentYear } from '../../../common/helpers';

// Both report issuers hold the same annual lock until the new code is committed.
export async function nextReportCode(tx: Prisma.TransactionClient, width: number) {
  const year = getCurrentYear();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(72651, ${year}::integer)`;
  const pattern = '^[0-9]+-' + year + '$';
  const [row] = await tx.$queryRaw<{ next: string }[]>`
    SELECT (COALESCE(MAX(split_part(code, '-', 1)::numeric), 0) + 1)::text AS next
    FROM "Report" WHERE code ~ ${pattern}
  `;
  return row.next.padStart(width, '0') + '-' + year;
}

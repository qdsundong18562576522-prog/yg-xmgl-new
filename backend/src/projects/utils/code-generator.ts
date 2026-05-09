import { PrismaClient } from '../../../generated/prisma/client';

const TYPE_MAP: Record<string, string> = {
  integration: 'JC',
  supply: 'GH',
};

function formatDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Generate a unique project code with format YGKI-{typeCode}-{YYYYMMDD}-{NNN}.
 * Uses a retry loop to handle concurrent generation — the unique constraint
 * on the `code` field ensures no duplicates are persisted.
 */
export async function generateProjectCode(
  prisma: PrismaClient,
  type: string,
  date: Date,
): Promise<string> {
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided for project code generation');
  }

  const typeCode = TYPE_MAP[type] || 'QT';
  const dateStr = formatDate(date);
  const prefix = `YGKI-${typeCode}-${dateStr}-`;

  // Retry loop: handle race conditions where two calls get the same sequence
  for (let attempt = 0; attempt < 5; attempt++) {
    const lastProject = await prisma.project.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let sequence = 1;
    if (lastProject) {
      const lastSeq = parseInt(lastProject.code.split('-').pop() || '0', 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    const code = `${prefix}${String(sequence).padStart(3, '0')}`;

    // Try to verify uniqueness — if the insert fails with a unique constraint
    // violation on the caller side, the caller can retry. We pre-check here
    // to catch the common case.
    const existing = await prisma.project.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
    // If the code already exists (race), loop to the next sequence
  }

  throw new Error('Failed to generate unique project code after 5 attempts');
}

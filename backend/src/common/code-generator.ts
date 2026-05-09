import { PrismaClient } from '../../generated/prisma/client';

const TYPE_MAP: Record<string, string> = {
  purchaseRequest: 'CGSQ',
  inquiryOrder: 'CGCX',
  purchaseConfirm: 'CGQR',
  deliveryNotice: 'GHTZ',
};

const MODELS = {
  purchaseRequest: 'purchaseRequest' as const,
  inquiryOrder: 'inquiryOrder' as const,
  purchaseConfirm: 'purchaseConfirm' as const,
  deliveryNotice: 'deliveryNotice' as const,
} as const;

type FormType = keyof typeof TYPE_MAP;

export async function generateFormCode(
  prisma: PrismaClient,
  type: FormType,
  date: Date,
): Promise<string> {
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date for code generation');
  }

  const prefix = TYPE_MAP[type];
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const codePrefix = `${prefix}-${dateStr}-`;

  // Retry loop for race conditions
  for (let attempt = 0; attempt < 5; attempt++) {
    const lastRecord = await (prisma as any)[type].findFirst({
      where: { code: { startsWith: codePrefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let sequence = 1;
    if (lastRecord) {
      const lastSeq = parseInt(lastRecord.code.split('-').pop() || '0', 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    const code = `${codePrefix}${String(sequence).padStart(3, '0')}`;

    const existing = await (prisma as any)[type].findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate unique form code');
}

export { TYPE_MAP };

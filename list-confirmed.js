import { prisma } from './src/lib/prisma.ts';

const confirmed = await prisma.timeSlot.findMany({
  where: { courtId: { not: null } },
  include: { instructor: true }
});

console.log(`Total confirmadas: ${confirmed.length}\n`);
confirmed.forEach(s => {
  const date = new Date(Number(s.start));
  console.log(`${date.toLocaleString('es-ES')} | ${s.instructor?.name} | Pista ${s.courtNumber}`);
});

await prisma.$disconnect();

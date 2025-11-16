const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const props = await p.timeSlot.findMany({
    where: {
      courtId: null,
      start: {
        gte: new Date('2025-10-30T08:00:00Z'),
        lte: new Date('2025-10-30T14:00:00Z')
      }
    },
    include: {
      instructor: {
        include: { user: true }
      }
    },
    orderBy: { start: 'asc' }
  });

  console.log(`\nPropuestas del 30 Oct (Total: ${props.length}):\n`);
  
  const byInstructor = {};
  props.forEach(pr => {
    const inst = pr.instructor?.user?.name || 'N/A';
    const time = new Date(pr.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (!byInstructor[inst]) byInstructor[inst] = [];
    byInstructor[inst].push({ time, id: pr.id });
  });

  for (const [inst, times] of Object.entries(byInstructor)) {
    console.log(`${inst} (${times.length} propuestas):`);
    times.forEach(t => console.log(`  ${t.time} - ${t.id}`));
    console.log('');
  }

  await p.$disconnect();
})();

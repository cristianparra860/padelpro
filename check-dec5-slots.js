const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  const slots = await prisma.$queryRaw`
    SELECT id, start, courtId, courtNumber 
    FROM TimeSlot 
    WHERE start LIKE '2025-12-05%' 
    ORDER BY start
  `;
  
  console.log('Clases 2025-12-05:', slots.length);
  slots.forEach(s => {
    const t = new Date(s.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
    console.log(`  ${t} - courtId: ${s.courtId} - courtNumber: ${s.courtNumber}`);
    console.log(`    ID: ${s.id}`);
  });
  
  await prisma.$disconnect();
}

checkSlots();

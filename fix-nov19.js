const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNov19() {
  console.log(' Arreglando día 19...\n');
  
  // 1. Eliminar bookings CANCELLED del día 19
  const deleted1 = await prisma.booking.deleteMany({
    where: {
      timeSlot: {
        start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') }
      },
      status: 'CANCELLED'
    }
  });
  
  console.log(` Eliminados ${deleted1.count} bookings CANCELLED`);
  
  // 2. Eliminar TimeSlots del día 19 sin bookings
  const deleted2 = await prisma.timeSlot.deleteMany({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null,
      bookings: { none: {} }
    }
  });
  
  console.log(` Eliminados ${deleted2.count} TimeSlots vacíos\n`);
  
  // 3. Regenerar día 19
  console.log(' Regenerando día 19...\n');
  const response = await fetch('http://localhost:9002/api/cron/generate-cards?targetDay=0');
  const result = await response.json();
  
  console.log(` Creadas ${result.created} clases para día 19`);
  
  // 4. Verificar total
  const final = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null
    }
  });
  
  console.log(`\n Total propuestas día 19: ${final}`);
  console.log('\n DÍA 19 REPARADO');
  console.log(' Refrescar calendario: Ctrl+Shift+R');
  
  await prisma.$disconnect();
}

fixNov19();

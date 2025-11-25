const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLate() {
  const lateClasses = await prisma.timeSlot.findMany({
    where: {
      start: { contains: '2025-12-17T2' }
    },
    include: {
      bookings: true,
      instructor: { select: { name: true } }
    }
  });
  
  console.log('=== CLASES DEL 17 DIC QUE EMPIEZAN CON "2" (20:00+ UTC) ===\n');
  
  lateClasses.forEach(cls => {
    const date = new Date(cls.start);
    const hourUTC = date.getUTCHours() + ':' + date.getUTCMinutes().toString().padStart(2, '0');
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    
    console.log(`${cls.start}`);
    console.log(`  UTC: ${hourUTC} | Local: ${hourLocal}`);
    console.log(`  Instructor: ${cls.instructor?.name}`);
    console.log(`  Bookings: ${cls.bookings.length}`);
    console.log(`  CourtId: ${cls.courtId}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkLate();

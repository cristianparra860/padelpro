import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOct20() {
  console.log('🔍 Checking TimeSlots for October 20, 2025');
  console.log('');
  
  // Query exacta que usa el API
  const date = '2025-10-20';
  const startOfDay = new Date(date + 'T00:00:00');
  const endOfDay = new Date(date + 'T23:59:59');
  
  console.log('📅 Date range:');
  console.log('   Start:', startOfDay.toISOString());
  console.log('   End:  ', endOfDay.toISOString());
  console.log('');
  
  // Test 1: Todas las clases sin filtro de fecha
  const allSlots = await prisma.timeSlot.findMany({
    where: { courtId: null },
    select: { id: true, start: true, courtId: true, courtNumber: true }
  });
  
  console.log('📊 Total proposals (courtId=null):', allSlots.length);
  
  if (allSlots.length > 0) {
    console.log('   First date:', allSlots[0].start);
    console.log('   Last date:', allSlots[allSlots.length - 1].start);
  }
  console.log('');
  
  // Test 2: Con filtro de fecha (como el API)
  const oct20Slots = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    select: { id: true, start: true, courtId: true, courtNumber: true }
  });
  
  console.log('📊 Oct 20 proposals with Prisma filter:', oct20Slots.length);
  
  if (oct20Slots.length > 0) {
    console.log('   Sample slots:');
    oct20Slots.slice(0, 5).forEach(slot => {
      console.log(`   - ${slot.id}: ${slot.start}`);
    });
  }
  console.log('');
  
  // Test 3: SQL raw query (como hace el API)
  const sqlQuery = `
    SELECT * FROM TimeSlot 
    WHERE start >= ? AND start <= ? 
    AND courtId IS NULL
    ORDER BY start ASC
  `;
  
  const sqlSlots = await prisma.$queryRawUnsafe(
    sqlQuery,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  ) as any[];
  
  console.log('📊 Oct 20 proposals with SQL:', sqlSlots.length);
  
  if (sqlSlots.length > 0) {
    console.log('   Sample slots:');
    sqlSlots.slice(0, 5).forEach((slot: any) => {
      console.log(`   - ${slot.id}: ${slot.start}`);
    });
  }
  
  await prisma.$disconnect();
}

checkOct20();

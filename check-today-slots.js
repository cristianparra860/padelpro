const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday() {
  const date = '2025-11-24';
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  console.log('🔍 Buscando slots para 2025-11-24...\n');
  console.log('Timestamps:', { startTimestamp, endTimestamp });
  
  // Query exacta del API
  const query = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
  const params = ['padel-estrella-madrid', startTimestamp, endTimestamp];
  
  console.log('Query SQL:', query);
  console.log('Params:', params);
  
  const slots = await prisma.$queryRawUnsafe(query, ...params);
  
  console.log(`\n📊 Total slots encontrados: ${slots.length}\n`);
  
  if (slots.length > 0) {
    console.log('Primeros 10 slots:');
    slots.slice(0, 10).forEach((slot, i) => {
      const startDate = new Date(Number(slot.start));
      console.log(`   ${i+1}. ${startDate.toISOString()} | Instructor: ${slot.instructorId ? slot.instructorId.substring(0, 10) + '...' : 'NULL'} | Level: ${slot.level}`);
    });
  }
  
  // Verificar cuántos tienen instructor
  const withInstructor = slots.filter(s => s.instructorId);
  const withoutInstructor = slots.filter(s => !s.instructorId);
  
  console.log(`\n📊 Resumen:`);
  console.log(`   Con instructor: ${withInstructor.length}`);
  console.log(`   Sin instructor: ${withoutInstructor.length}`);
  
  await prisma.$disconnect();
}

checkToday();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  console.log('🔍 Verificando formato de fechas en TimeSlots...\n');
  
  const slots = await prisma.timeSlot.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Total slots: ${await prisma.timeSlot.count()}\n`);
  
  if (slots.length > 0) {
    console.log('📅 Primeros 10 TimeSlots:\n');
    slots.forEach((slot, i) => {
      console.log(`${i + 1}. ID: ${slot.id}`);
      console.log(`   Start: ${slot.start} (tipo: ${typeof slot.start})`);
      console.log(`   End: ${slot.end} (tipo: ${typeof slot.end})`);
      console.log(`   Instructor: ${slot.instructorId}`);
      console.log(`   Court: ${slot.courtNumber || 'NULL'}`);
      
      // Intentar parsear la fecha
      if (typeof slot.start === 'string') {
        const date = new Date(slot.start);
        console.log(`   Parseado: ${date.toLocaleString('es-ES')}`);
      } else if (typeof slot.start === 'number') {
        const date = new Date(slot.start);
        console.log(`   Timestamp: ${date.toLocaleString('es-ES')}`);
      }
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkDates().catch(console.error);

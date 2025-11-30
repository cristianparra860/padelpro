const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Contar total
  const total = await prisma.timeSlot.count();
  const proposed = await prisma.timeSlot.count({ where: { courtId: null } });
  const confirmed = await prisma.timeSlot.count({ where: { courtId: { not: null } } });
  
  console.log('=== ESTADÍSTICAS DE TIMESLOTS ===');
  console.log(`Total TimeSlots: ${total}`);
  console.log(`Propuestas (courtId=null): ${proposed}`);
  console.log(`Confirmadas (courtId!=null): ${confirmed}`);
  
  // Ver fechas
  const oldest = await prisma.timeSlot.findFirst({
    orderBy: { start: 'asc' },
    select: { start: true, level: true, courtId: true }
  });
  
  const newest = await prisma.timeSlot.findFirst({
    orderBy: { start: 'desc' },
    select: { start: true, level: true, courtId: true }
  });
  
  console.log('\nRango de fechas:');
  console.log(`Primera clase: ${oldest?.start}`);
  console.log(`Última clase: ${newest?.start}`);
  
  // Ver distribución
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const future = await prisma.timeSlot.count({
    where: { start: { gte: today } }
  });
  
  const past = await prisma.timeSlot.count({
    where: { start: { lt: today } }
  });
  
  console.log(`\nClases futuras: ${future}`);
  console.log(`Clases pasadas: ${past}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

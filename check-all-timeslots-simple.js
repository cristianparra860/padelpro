const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTimeSlots() {
  console.log('🔍 Verificando TODOS los TimeSlots en la BD\n');
  
  const clubId = 'padel-estrella-madrid';
  
  // Total sin filtros
  const total = await prisma.timeSlot.count({
    where: { clubId }
  });
  
  console.log(`💾 Total TimeSlots en BD: ${total}\n`);
  
  // Por día (próximos 7 días)
  const today = new Date('2025-11-24');
  
  console.log('📅 TimeSlots por día:');
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59.999Z');
    
    const count = await prisma.timeSlot.count({
      where: {
        clubId,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    // Contar con courtId NULL (disponibles)
    const availableCount = await prisma.timeSlot.count({
      where: {
        clubId,
        courtId: null,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    const dateStr = date.toISOString().split('T')[0];
    console.log(`   ${dateStr}: ${count} total (${availableCount} disponibles, ${count - availableCount} confirmadas)`);
  }
  
  // Ver detalles de hoy
  console.log('\n\n📋 Detalles de TimeSlots de HOY (2025-11-24):');
  const todaySlots = await prisma.timeSlot.findMany({
    where: {
      clubId,
      start: {
        gte: new Date('2025-11-24T00:00:00.000Z'),
        lte: new Date('2025-11-24T23:59:59.999Z')
      }
    },
    include: {
      instructor: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      start: 'asc'
    }
  });
  
  console.log(`\n   Total: ${todaySlots.length} slots`);
  todaySlots.forEach((slot, i) => {
    const hour = new Date(slot.start).getUTCHours();
    const min = new Date(slot.start).getUTCMinutes();
    console.log(`   ${i+1}. ${hour}:${min.toString().padStart(2,'0')} | ${slot.instructor?.name || 'Sin instructor'} | ${slot.level} | ${slot.genderCategory || 'sin categoría'} | courtId: ${slot.courtId ? 'asignado' : 'NULL'}`);
  });
  
  await prisma.$disconnect();
}

checkAllTimeSlots();

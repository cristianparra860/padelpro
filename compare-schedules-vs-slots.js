const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareSchedulesVsSlots() {
  console.log('🔍 Comparando InstructorSchedule vs TimeSlot para hoy\n');
  
  const clubId = 'padel-estrella-madrid';
  const today = '2025-11-24';
  const startOfDay = new Date(today + 'T00:00:00.000Z');
  const endOfDay = new Date(today + 'T23:59:59.999Z');
  
  // 1. Contar en InstructorSchedule (lo que ve el calendario admin)
  const scheduleCount = await prisma.instructorSchedule.count({
    where: {
      startTime: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  console.log(`📅 InstructorSchedule (calendario admin): ${scheduleCount} registros`);
  
  // Muestra de InstructorSchedule
  const scheduleSample = await prisma.instructorSchedule.findMany({
    where: {
      startTime: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      instructor: true
    },
    take: 10
  });
  
  console.log('\n📋 Muestra de InstructorSchedule:');
  scheduleSample.forEach((s, i) => {
    const hour = new Date(s.startTime).getUTCHours();
    console.log(`   ${i+1}. ${s.instructor?.name || 'Sin instructor'} | ${hour}:00 | occupied: ${s.isOccupied}`);
  });
  
  // 2. Contar en TimeSlot (lo que devuelve el API de clases)
  const slotCount = await prisma.timeSlot.count({
    where: {
      clubId,
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  console.log(`\n\n📅 TimeSlot (API de clases): ${slotCount} registros`);
  
  // Muestra de TimeSlot
  const slotSample = await prisma.timeSlot.findMany({
    where: {
      clubId,
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      instructor: true
    }
  });
  
  console.log('\n📋 TODOS los TimeSlot de hoy:');
  slotSample.forEach((s, i) => {
    const hour = new Date(s.start).getUTCHours();
    console.log(`   ${i+1}. ${s.instructor?.name || 'Sin instructor'} | ${hour}:00 | level: ${s.level} | courtId: ${s.courtId ? 'asignado' : 'NULL'}`);
  });
  
  console.log(`\n\n🎯 CONCLUSIÓN:`);
  console.log(`   - InstructorSchedule: ${scheduleCount} (lo que ves en calendario admin)`);
  console.log(`   - TimeSlot: ${slotCount} (lo que devuelve API)`);
  
  if (scheduleCount > slotCount) {
    console.log(`\n❌ PROBLEMA: Faltan ${scheduleCount - slotCount} TimeSlots`);
    console.log('   Los InstructorSchedule no se convirtieron en TimeSlots');
    console.log('   Solución: Ejecutar el generador de TimeSlots desde InstructorSchedule');
  } else if (slotCount === scheduleCount) {
    console.log('\n✅ Todos los InstructorSchedule tienen su TimeSlot correspondiente');
  }
  
  await prisma.$disconnect();
}

compareSchedulesVsSlots();

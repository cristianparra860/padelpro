const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorSchedules() {
  console.log('📅 Verificando InstructorSchedule vs TimeSlot para HOY (24 nov)\n');
  
  const date = '2025-11-24';
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  // InstructorSchedule - Los horarios DISPONIBLES de cada instructor
  const schedules = await prisma.instructorSchedule.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      instructor: true
    },
    orderBy: {
      startTime: 'asc'
    }
  });
  
  console.log(`📊 INSTRUCTOR SCHEDULES (horarios disponibles): ${schedules.length}`);
  
  if (schedules.length > 0) {
    // Agrupar por hora
    const byHour = {};
    schedules.forEach(s => {
      const hour = new Date(s.startTime).getUTCHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(s);
    });
    
    console.log('\n📋 Schedules por hora:');
    Object.keys(byHour).sort((a, b) => a - b).forEach(hour => {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      console.log(`   ${hourStr} → ${byHour[hour].length} horarios`);
    });
  }
  
  // TimeSlot - Las CLASES REALES creadas
  const timeSlots = await prisma.timeSlot.count({
    where: {
      clubId: 'padel-estrella-madrid',
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  console.log(`\n📊 TIMESLOTS (clases creadas): ${timeSlots}`);
  
  console.log('\n🎯 EXPLICACIÓN:');
  console.log('   - InstructorSchedule = Cuadrados naranjas en calendario (horarios DISPONIBLES)');
  console.log('   - TimeSlot = Tarjetas de clase que ves en el frontend (clases CREADAS)');
  console.log(`   - Hay ${schedules.length} horarios disponibles pero solo ${timeSlots} clases creadas`);
  
  await prisma.$disconnect();
}

checkInstructorSchedules();

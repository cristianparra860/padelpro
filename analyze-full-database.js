const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('🔍 ANÁLISIS COMPLETO DE LA BASE DE DATOS\n');
  
  const clubId = 'padel-estrella-madrid';
  
  // 1. Total de TimeSlots
  const totalSlots = await prisma.timeSlot.count({ where: { clubId } });
  console.log(`📊 TOTAL TimeSlots en BD: ${totalSlots}\n`);
  
  // 2. Rango de fechas
  const firstSlot = await prisma.timeSlot.findFirst({
    where: { clubId },
    orderBy: { start: 'asc' }
  });
  
  const lastSlot = await prisma.timeSlot.findFirst({
    where: { clubId },
    orderBy: { start: 'desc' }
  });
  
  if (firstSlot && lastSlot) {
    console.log('📅 RANGO DE FECHAS:');
    console.log(`   Primer slot: ${new Date(firstSlot.start).toISOString()}`);
    console.log(`   Último slot: ${new Date(lastSlot.start).toISOString()}\n`);
  }
  
  // 3. Slots por día (próximos 7 días desde hoy)
  console.log('📆 SLOTS POR DÍA (próximos 7 días):\n');
  
  const today = new Date('2025-11-24T00:00:00.000Z');
  
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(today);
    dayStart.setUTCDate(today.getUTCDate() + i);
    dayStart.setUTCHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        clubId,
        start: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        instructor: true
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    const dateStr = dayStart.toISOString().split('T')[0];
    console.log(`   ${dateStr} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayStart.getUTCDay()]}): ${slots.length} slots`);
    
    if (slots.length > 0) {
      // Agrupar por hora
      const byHour = {};
      slots.forEach(slot => {
        const hour = new Date(slot.start).getUTCHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push(slot);
      });
      
      // Mostrar horarios
      const hours = Object.keys(byHour).sort((a, b) => a - b);
      console.log(`      Horarios: ${hours.map(h => `${h}:00`).join(', ')}`);
      
      // Mostrar instructores
      const instructors = {};
      slots.forEach(slot => {
        const name = slot.instructor?.name || 'Sin instructor';
        instructors[name] = (instructors[name] || 0) + 1;
      });
      
      console.log(`      Instructores:`, instructors);
    }
    
    console.log('');
  }
  
  // 4. Horarios más comunes
  console.log('⏰ ANÁLISIS DE HORARIOS (todos los slots):\n');
  
  const allSlots = await prisma.timeSlot.findMany({
    where: { clubId },
    select: { start: true }
  });
  
  const hourCounts = {};
  allSlots.forEach(slot => {
    const hour = new Date(slot.start).getUTCHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([hour, count]) => `${hour}:00 (${count} slots)`)
    .join(', ');
  
  console.log(`   ${sortedHours}\n`);
  
  // 5. Instructores
  console.log('👨‍🏫 INSTRUCTORES:\n');
  
  const instructors = await prisma.instructor.findMany();
  console.log(`   Total instructores: ${instructors.length}`);
  instructors.forEach(inst => {
    console.log(`   - ${inst.name} (ID: ${inst.id.substring(0, 15)}...)`);
  });
  
  await prisma.$disconnect();
}

analyzeDatabase();

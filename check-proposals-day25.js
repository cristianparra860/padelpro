const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProposals25() {
  console.log('📅 Verificando PROPUESTAS de clases para el 25 de noviembre 2025\n');
  
  const date = '2025-11-25';
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const clubId = 'padel-estrella-madrid';
  
  // Propuestas (courtId = NULL)
  const proposals = await prisma.timeSlot.findMany({
    where: {
      clubId,
      courtId: null,
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      instructor: true
    },
    orderBy: {
      start: 'asc'
    }
  });
  
  console.log(`🎯 Total PROPUESTAS (courtId = NULL): ${proposals.length}\n`);
  
  if (proposals.length > 0) {
    // Agrupar por hora
    const byHour = {};
    proposals.forEach(slot => {
      const hour = new Date(slot.start).getUTCHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(slot);
    });
    
    console.log('📋 Propuestas por hora (UTC):');
    Object.keys(byHour).sort((a, b) => a - b).forEach(hour => {
      const hourStr = hour.toString().padStart(2, '0');
      const slots = byHour[hour];
      console.log(`\n   ${hourStr}:00 → ${slots.length} propuestas`);
      
      slots.forEach(slot => {
        const instructorName = slot.instructor?.name || 'Sin instructor';
        const start = new Date(slot.start).toISOString().substring(11, 16);
        console.log(`      - ${instructorName} | ${slot.level} | ${slot.genderCategory || 'sin categoría'} | ${start}`);
      });
    });
  }
  
  // También clases confirmadas (con courtId)
  const confirmed = await prisma.timeSlot.count({
    where: {
      clubId,
      courtId: { not: null },
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  
  console.log(`\n\n✅ Clases CONFIRMADAS (courtId asignado): ${confirmed}`);
  console.log(`📊 TOTAL (propuestas + confirmadas): ${proposals.length + confirmed}`);
  
  await prisma.$disconnect();
}

checkProposals25();

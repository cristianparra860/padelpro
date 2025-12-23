const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaFilter() {
  try {
    const date = '2025-12-22';
    const instructorId = 'cmjhhs1k30002tga4zzj2etzc';
    
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    
    console.log('🔍 Buscando con Prisma:');
    console.log('   instructorId:', instructorId);
    console.log('   start >=', startOfDay.toISOString());
    console.log('   start <=', endOfDay.toISOString());
    console.log('');

    const slots = await prisma.timeSlot.findMany({
      where: {
        instructorId: instructorId,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    console.log(`📊 Encontrados: ${slots.length} TimeSlots\n`);

    if (slots.length > 0) {
      slots.forEach((slot, idx) => {
        console.log(`${idx + 1}. ID: ${slot.id}`);
        console.log(`   start: ${slot.start.toISOString()} (${slot.start.toLocaleString('es-ES')})`);
        console.log('');
      });
    } else {
      // Buscar SIN filtro de fecha para ver qué hay
      console.log('🔍 Buscando SIN filtro de fecha...\n');
      const allSlots = await prisma.timeSlot.findMany({
        where: { instructorId }
      });
      
      console.log(`Slots del instructor (sin filtro fecha): ${allSlots.length}\n`);
      allSlots.forEach((slot, idx) => {
        console.log(`${idx + 1}. start: ${slot.start.toISOString()}`);
        console.log(`   ${slot.start.toLocaleString('es-ES')}`);
        console.log(`   ¿Está en rango? ${slot.start >= startOfDay && slot.start <= endOfDay}`);
        console.log('');
      });
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('Error:', error);
  }
}

testPrismaFilter();

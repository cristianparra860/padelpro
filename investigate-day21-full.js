const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateDay21() {
  try {
    console.log('🔍 INVESTIGACIÓN COMPLETA DÍA 21\n');
    
    const day21Start = new Date('2025-11-21T00:00:00.000Z');
    const day21End = new Date('2025-11-22T00:00:00.000Z');
    
    // 1. Ver TODAS las clases del día 21 (propuestas y confirmadas)
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: day21Start,
          lt: day21End
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`📊 TOTAL TimeSlots día 21: ${allSlots.length}\n`);
    
    const proposals = allSlots.filter(s => s.courtId === null);
    const confirmed = allSlots.filter(s => s.courtId !== null);
    
    console.log(`🟠 Propuestas (courtId = null): ${proposals.length}`);
    console.log(`🟢 Confirmadas (courtId != null): ${confirmed.length}\n`);
    
    // 2. Verificar rango de horas de las propuestas
    if (proposals.length > 0) {
      const hours = proposals.map(p => {
        const date = new Date(p.start);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      });
      
      const uniqueHours = [...new Set(hours)].sort();
      console.log('⏰ HORAS de propuestas:', uniqueHours.slice(0, 10), '...\n');
      
      const firstProposal = proposals[0];
      const lastProposal = proposals[proposals.length - 1];
      
      console.log(`Primera propuesta: ${new Date(firstProposal.start).toLocaleTimeString('es-ES')}`);
      console.log(`Última propuesta: ${new Date(lastProposal.start).toLocaleTimeString('es-ES')}`);
      console.log(`Nivel primera: ${firstProposal.level}`);
      console.log(`Nivel última: ${lastProposal.level}\n`);
    }
    
    // 3. Probar el endpoint de propuestas para una hora específica
    console.log('🌐 TEST: Endpoint de propuestas para 07:00...\n');
    
    const test7am = new Date('2025-11-21T07:00:00.000Z');
    const proposalsAt7 = await prisma.timeSlot.findMany({
      where: {
        clubId: 'padel-estrella-madrid',
        start: test7am,
        courtId: null
      },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      }
    });
    
    console.log(`Propuestas a las 07:00: ${proposalsAt7.length}`);
    proposalsAt7.forEach(p => {
      console.log(`  - ID: ${p.id.substring(0, 10)}... Nivel: ${p.level}, Bookings: ${p.bookings.length}`);
    });
    
    // 4. Probar endpoint real
    console.log('\n🌐 Llamando al endpoint real...\n');
    const response = await fetch(
      `http://localhost:9002/api/timeslots/proposals?clubId=padel-estrella-madrid&start=${test7am.toISOString()}&userLevel=intermedio`
    );
    
    const data = await response.json();
    console.log(`Respuesta del endpoint: ${data.total} propuestas`);
    if (data.proposals) {
      data.proposals.forEach((p, i) => {
        console.log(`  ${i + 1}. Nivel: ${p.level}, Bookings: ${p.bookings?.length || 0}`);
      });
    } else {
      console.log('  ERROR:', data);
    }
    
    // 5. Comparar con día 13 (que funciona)
    console.log('\n\n📊 COMPARACIÓN CON DÍA 13 (que funciona)...\n');
    
    const day13Start = new Date('2025-11-13T00:00:00.000Z');
    const day13End = new Date('2025-11-14T00:00:00.000Z');
    
    const day13Slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: day13Start,
          lt: day13End
        }
      }
    });
    
    const day13Proposals = day13Slots.filter(s => s.courtId === null);
    
    console.log(`Día 13 - Total TimeSlots: ${day13Slots.length}`);
    console.log(`Día 13 - Propuestas: ${day13Proposals.length}`);
    
    if (day13Proposals.length > 0) {
      const hours13 = day13Proposals.map(p => {
        const date = new Date(p.start);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      });
      const uniqueHours13 = [...new Set(hours13)].sort();
      console.log(`Día 13 - Horas:`, uniqueHours13.slice(0, 5), '...');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

investigateDay21();

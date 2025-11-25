/**
 * Debug: Verificar qué está mostrando el calendario admin
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAdminCalendar() {
  console.log('\n🔍 DEBUG: CALENDARIO ADMIN - DÍA 21\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    
    // Buscar TimeSlots alrededor del día 21
    const day20 = new Date(2025, 10, 20, 0, 0, 0, 0);
    const day23 = new Date(2025, 10, 23, 0, 0, 0, 0);
    
    console.log('📅 Buscando slots entre 20 y 23 de noviembre...\n');

    const slots = await prisma.timeSlot.findMany({
      where: {
        clubId: clubId,
        start: {
          gte: day20,
          lt: day23
        }
      },
      include: {
        instructor: true
      },
      orderBy: {
        start: 'asc'
      }
    });

    console.log(`Total slots encontrados: ${slots.length}\n`);

    // Agrupar por día
    const byDay = new Map();
    
    slots.forEach(slot => {
      const date = new Date(slot.start);
      const dayKey = date.toLocaleDateString('es-ES');
      
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, []);
      }
      byDay.get(dayKey).push(slot);
    });

    if (byDay.size === 0) {
      console.log('❌ No hay slots en ese rango de fechas');
      console.log('\n🔍 Buscando ANY slot futuro...\n');
      
      const anySlot = await prisma.timeSlot.findFirst({
        where: {
          clubId: clubId,
          start: { gte: new Date() }
        },
        orderBy: { start: 'asc' }
      });

      if (anySlot) {
        const date = new Date(anySlot.start);
        console.log(`✅ Primer slot futuro encontrado: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES')}`);
        console.log(`   Las clases terminan antes del día 21`);
      } else {
        console.log('❌ No hay ningún slot futuro en la BD');
      }
      
      return;
    }

    console.log('📊 SLOTS POR DÍA:\n');
    
    Array.from(byDay.entries()).forEach(([day, slots]) => {
      console.log(`${day}: ${slots.length} slots`);
      if (slots.length > 0 && slots.length <= 5) {
        slots.forEach(slot => {
          const date = new Date(slot.start);
          console.log(`   - ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.instructor.name}`);
        });
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('💡 POSIBLES CAUSAS:\n');
    console.log('1. El generador no está creando slots más allá del día 20');
    console.log('2. Los slots del día 21 se borraron por algún motivo');
    console.log('3. El calendario admin está usando datos en caché');
    console.log('4. Hay un problema de zona horaria (UTC vs local)');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAdminCalendar();

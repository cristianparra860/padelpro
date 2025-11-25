/**
 * Test: Simular llamada a /api/timeslots para el día 21
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDay21Endpoint() {
  console.log('\n🧪 TEST: ENDPOINT /api/timeslots PARA DÍA 21\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    
    // Día 21 de noviembre 2025
    const day21 = new Date(2025, 10, 21, 0, 0, 0, 0); // mes 10 = noviembre
    const day22 = new Date(2025, 10, 22, 0, 0, 0, 0);
    
    console.log(`📅 Buscando slots para: ${day21.toLocaleDateString('es-ES')}\n`);

    // 1. Buscar TimeSlots en la BD (lo que ve el admin)
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        clubId: clubId,
        start: {
          gte: day21,
          lt: day22
        }
      },
      include: {
        instructor: true,
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    console.log(`📊 Total TimeSlots en BD para día 21: ${allSlots.length}\n`);

    if (allSlots.length === 0) {
      console.log('❌ No hay TimeSlots en la base de datos para el día 21');
      console.log('   El generador automático no está creando clases para este día');
      return;
    }

    // Analizar los slots
    const withCourtId = allSlots.filter(s => s.courtId !== null);
    const withoutCourtId = allSlots.filter(s => s.courtId === null);
    const withBookings = withoutCourtId.filter(s => s.bookings.length > 0);
    const empty = withoutCourtId.filter(s => s.bookings.length === 0);

    console.log('📋 DESGLOSE:');
    console.log(`   ✅ Con courtId (confirmadas): ${withCourtId.length}`);
    console.log(`   📝 Sin courtId, con bookings: ${withBookings.length}`);
    console.log(`   ⚪ Sin courtId, sin bookings: ${empty.length}`);
    console.log('');

    // 2. Verificar disponibilidad de pistas para ese día
    const allCourts = await prisma.court.findMany({
      where: { clubId: clubId }
    });

    console.log(`🏟️ Pistas disponibles en el club: ${allCourts.length}\n`);

    // 3. Verificar si hay clases confirmadas que bloqueen las pistas
    const confirmedForDay21 = withCourtId;
    
    if (confirmedForDay21.length > 0) {
      console.log(`⚠️ Clases confirmadas que ocupan pistas el día 21: ${confirmedForDay21.length}\n`);
      confirmedForDay21.slice(0, 5).forEach((slot, idx) => {
        const date = new Date(slot.start);
        console.log(`   ${idx + 1}. ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.instructor.name} - Pista ${slot.courtNumber}`);
      });
      console.log('');
    }

    // 4. Analizar propuestas (sin courtId)
    console.log('🔍 ANÁLISIS DE PROPUESTAS (sin courtId):\n');

    if (withoutCourtId.length === 0) {
      console.log('❌ No hay propuestas (todas tienen courtId asignado)');
      console.log('   Esto significa que TODAS las clases del día 21 ya se completaron');
      return;
    }

    // Verificar cuántas tienen pistas disponibles
    let withAvailableCourts = 0;
    let withoutAvailableCourts = 0;

    for (const slot of withoutCourtId.slice(0, 10)) {
      const slotStart = slot.start.getTime();
      const slotEnd = slot.end.getTime();

      // Ver si alguna pista está libre
      let hasAvailableCourt = false;
      for (const court of allCourts) {
        const isOccupied = confirmedForDay21.some(confirmed => {
          const confirmedStart = confirmed.start.getTime();
          const confirmedEnd = confirmed.end.getTime();
          const isSameCourt = confirmed.courtId === court.id;
          const hasOverlap = slotStart < confirmedEnd && slotEnd > confirmedStart;
          return isSameCourt && hasOverlap;
        });

        if (!isOccupied) {
          hasAvailableCourt = true;
          break;
        }
      }

      if (hasAvailableCourt) {
        withAvailableCourts++;
      } else {
        withoutAvailableCourts++;
      }
    }

    console.log(`✅ Propuestas con pistas disponibles: ${withAvailableCourts}`);
    console.log(`❌ Propuestas sin pistas disponibles: ${withoutAvailableCourts}`);
    console.log('');

    // 5. Conclusión
    console.log('='.repeat(70));
    console.log('📌 CONCLUSIÓN:\n');

    if (withoutCourtId.length === 0) {
      console.log('❌ NO HAY PROPUESTAS - Todas las clases tienen pista asignada');
    } else if (withoutAvailableCourts > withAvailableCourts) {
      console.log('⚠️ HAY PROPUESTAS PERO POCAS TIENEN PISTAS DISPONIBLES');
      console.log('   El filtro de availableCourtsCount está ocultando muchas clases');
      console.log('   Posible solución: Desactivar el filtro o aumentar pistas en el club');
    } else {
      console.log('✅ HAY PROPUESTAS CON PISTAS DISPONIBLES');
      console.log('   El problema puede estar en otro filtro (nivel, género, horario)');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDay21Endpoint();

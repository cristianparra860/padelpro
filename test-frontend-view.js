/**
 * Test: Simular exactamente lo que ve el usuario en el frontend
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateFrontendView() {
  console.log('\n🖥️ SIMULACIÓN: LO QUE VE EL USUARIO EN EL FRONTEND\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = today.getTime() + (24 * 60 * 60 * 1000);

    // Buscar slots para HOY (como lo vería en el frontend)
    const slots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.level, ts.genderCategory, ts.courtId,
             i.name as instructorName,
             (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status IN ('PENDING', 'CONFIRMED')) as bookingCount
      FROM TimeSlot ts
      JOIN Instructor i ON i.id = ts.instructorId
      WHERE ts.clubId = ${clubId}
      AND ts.courtId IS NULL
      AND ts.start >= ${today.getTime()}
      AND ts.start < ${tomorrow}
      ORDER BY ts.start ASC
    `;

    console.log(`📅 Tarjetas disponibles para HOY (${new Date().toLocaleDateString('es-ES')}):\n`);
    console.log(`Total tarjetas: ${slots.length}\n`);

    if (slots.length === 0) {
      console.log('⚠️ No hay tarjetas disponibles para hoy');
      return;
    }

    // Agrupar por instructor y hora para detectar duplicados
    const grouped = new Map();
    
    slots.forEach(slot => {
      const date = new Date(slot.start);
      const timeKey = `${slot.instructorName}-${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey).push(slot);
    });

    console.log('🔍 ANÁLISIS DE DUPLICADOS:\n');

    let duplicateGroups = 0;
    let singleGroups = 0;

    Array.from(grouped.entries()).forEach(([timeKey, slots]) => {
      if (slots.length > 1) {
        duplicateGroups++;
        const time = timeKey.split('-')[1];
        const instructor = timeKey.split('-')[0];
        
        console.log(`⚡ ${time} - ${instructor} (${slots.length} tarjetas):`);
        slots.forEach((slot, idx) => {
          const bookings = Number(slot.bookingCount);
          const status = bookings > 0 ? '👥 CON INSCRIPCIONES' : '⚪ VACÍA';
          console.log(`   ${idx + 1}. ${slot.level}/${slot.genderCategory || 'NULL'} - ${status} (${bookings} bookings)`);
        });
        console.log('');
      } else {
        singleGroups++;
      }
    });

    console.log('='.repeat(70));
    console.log('📊 RESUMEN:');
    console.log(`   ⚡ Grupos con duplicados: ${duplicateGroups}`);
    console.log(`   📋 Grupos sin duplicados: ${singleGroups}`);
    console.log(`   📌 Total grupos de hora/instructor: ${grouped.size}`);

    if (duplicateGroups === 0) {
      console.log('\n❌ NO HAY DUPLICADOS VISIBLES EN EL FRONTEND');
      console.log('💡 Esto puede significar:');
      console.log('   1. No se han hecho reservas hoy que clasifiquen TimeSlots');
      console.log('   2. Las tarjetas duplicadas ya se completaron y tienen courtId');
      console.log('   3. Las tarjetas duplicadas son de otros días');
    } else {
      console.log('\n✅ HAY DUPLICADOS VISIBLES');
      console.log('   El sistema ESTÁ funcionando correctamente');
      console.log('   Las tarjetas con inscripciones deberían aparecer PRIMERO');
    }

    // Verificar el ordenamiento con el nuevo sistema
    console.log('\n' + '='.repeat(70));
    console.log('🎯 VERIFICAR ORDENAMIENTO (Con inscripciones primero):\n');

    const withBookings = slots.filter(s => Number(s.bookingCount) > 0);
    const withoutBookings = slots.filter(s => Number(s.bookingCount) === 0);

    console.log(`✅ Tarjetas CON inscripciones: ${withBookings.length} (deberían aparecer PRIMERO)`);
    withBookings.slice(0, 5).forEach((slot, idx) => {
      const date = new Date(slot.start);
      console.log(`   ${idx + 1}. ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.instructorName} (${Number(slot.bookingCount)} bookings)`);
    });

    console.log(`\n⚪ Tarjetas SIN inscripciones: ${withoutBookings.length} (deberían aparecer DESPUÉS)`);
    withoutBookings.slice(0, 5).forEach((slot, idx) => {
      const date = new Date(slot.start);
      console.log(`   ${idx + 1}. ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slot.instructorName}`);
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateFrontendView();

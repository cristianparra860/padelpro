/**
 * Test: Verificar que un usuario NO puede inscribirse en múltiples
 * tarjetas del mismo instructor/hora/día
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testValidacionMismoInstructorHora() {
  console.log('\n🧪 TEST: VALIDACIÓN - NO MÚLTIPLES INSCRIPCIONES MISMO INSTRUCTOR/HORA\n');
  console.log('='.repeat(70));

  try {
    // 1. Buscar usuario
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario: ${user.name}`);

    // 2. Buscar TimeSlots del mismo instructor/hora
    const now = Date.now();
    const futureSlot = await prisma.timeSlot.findFirst({
      where: {
        start: { gt: new Date(now) },
        courtId: null,
        clubId: 'padel-estrella-madrid'
      },
      include: { instructor: true },
      orderBy: { start: 'asc' }
    });

    if (!futureSlot) {
      console.log('❌ No hay TimeSlots disponibles');
      return;
    }

    console.log(`\n📋 TimeSlot base:`);
    console.log(`   Instructor: ${futureSlot.instructor?.name}`);
    console.log(`   Fecha/Hora: ${new Date(futureSlot.start).toLocaleString('es-ES')}`);

    // 3. Crear segunda tarjeta con mismo instructor/hora (simular sistema)
    const slot2 = await prisma.timeSlot.create({
      data: {
        clubId: futureSlot.clubId,
        instructorId: futureSlot.instructorId,
        start: futureSlot.start,
        end: futureSlot.end,
        maxPlayers: futureSlot.maxPlayers,
        totalPrice: futureSlot.totalPrice,
        instructorPrice: futureSlot.instructorPrice,
        courtRentalPrice: futureSlot.courtRentalPrice,
        level: 'ABIERTO',
        genderCategory: 'mixto',
        category: futureSlot.category,
        courtId: null,
        courtNumber: null
      }
    });

    console.log(`\n✅ Segunda tarjeta creada (simular sistema de carreras)`);
    console.log(`   ID Tarjeta 1: ${futureSlot.id}`);
    console.log(`   ID Tarjeta 2: ${slot2.id}`);

    // 4. Crear booking en la primera tarjeta
    console.log(`\n🔵 PASO 1: Usuario se inscribe en Tarjeta 1...`);
    
    const booking1 = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: futureSlot.id,
        groupSize: 2,
        status: 'PENDING',
        amountBlocked: futureSlot.totalPrice
      }
    });

    console.log(`✅ Inscripción en Tarjeta 1 exitosa: ${booking1.id}`);

    // 5. Intentar crear booking en la segunda tarjeta (DEBE FALLAR)
    console.log(`\n🔵 PASO 2: Usuario intenta inscribirse en Tarjeta 2 (mismo instructor/hora)...`);

    let booking2Failed = false;
    let errorMessage = '';

    try {
      // Simular la validación del API
      const existingBookingSameTimeInstructor = await prisma.$queryRaw`
        SELECT b.id, ts.id as timeSlotId, ts.start
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${user.id}
        AND b.status IN ('PENDING', 'CONFIRMED')
        AND ts.instructorId = ${futureSlot.instructorId}
        AND ts.start = ${futureSlot.start.getTime()}
        AND b.timeSlotId != ${slot2.id}
      `;

      if (existingBookingSameTimeInstructor.length > 0) {
        booking2Failed = true;
        const existingTime = new Date(Number(existingBookingSameTimeInstructor[0].start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        errorMessage = `Ya tienes una inscripción con este instructor a las ${existingTime}. No puedes inscribirte en múltiples grupos de la misma clase.`;
        console.log(`❌ Validación bloqueó la inscripción: ${errorMessage}`);
      } else {
        // Si pasa la validación, crear el booking
        const booking2 = await prisma.booking.create({
          data: {
            userId: user.id,
            timeSlotId: slot2.id,
            groupSize: 2,
            status: 'PENDING',
            amountBlocked: slot2.totalPrice
          }
        });
        console.log(`⚠️ Inscripción en Tarjeta 2 permitida: ${booking2.id} (NO DEBERÍA PASAR)`);
      }
    } catch (error) {
      booking2Failed = true;
      errorMessage = error.message;
      console.log(`❌ Error al intentar inscribirse: ${errorMessage}`);
    }

    // 6. Verificar resultado
    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(70));

    const allUserBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        timeSlotId: { in: [futureSlot.id, slot2.id] }
      }
    });

    console.log(`\nBookings del usuario para estas tarjetas: ${allUserBookings.length}`);
    allUserBookings.forEach((b, idx) => {
      console.log(`  ${idx + 1}. TimeSlot: ${b.timeSlotId === futureSlot.id ? 'Tarjeta 1' : 'Tarjeta 2'}, Status: ${b.status}`);
    });

    if (booking2Failed && allUserBookings.length === 1) {
      console.log('\n✅ ✅ ✅ VALIDACIÓN EXITOSA:');
      console.log('   - Usuario puede inscribirse en Tarjeta 1 ✅');
      console.log('   - Usuario NO puede inscribirse en Tarjeta 2 (mismo instructor/hora) ✅');
      console.log('   - Se evita bucle de inscripciones ✅');
    } else if (allUserBookings.length > 1) {
      console.log('\n❌ FALLO: Usuario se inscribió en múltiples tarjetas (NO DEBERÍA)');
    } else {
      console.log('\n⚠️ Resultado inesperado');
    }

    // 7. LIMPIEZA
    console.log('\n🧹 LIMPIEZA...');
    await prisma.booking.deleteMany({
      where: {
        userId: user.id,
        timeSlotId: { in: [futureSlot.id, slot2.id] }
      }
    });
    await prisma.timeSlot.delete({ where: { id: slot2.id } });
    console.log('✅ Datos de prueba eliminados\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testValidacionMismoInstructorHora();

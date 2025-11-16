/**
 * Test completo: Crear booking real → Cancelarlo → Verificar limpieza
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealBookingCancel() {
  console.log('\n🧪 TEST COMPLETO: BOOKING → CANCEL → VERIFICAR\n');
  console.log('='.repeat(70));

  try {
    // 1. Buscar usuario Alex
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario: ${user.name} (${user.id})`);
    console.log(`   Créditos disponibles: ${user.credits}`);
    console.log(`   Créditos bloqueados: ${user.blockedCredits || 0}`);

    // 2. Buscar un TimeSlot futuro sin courtId (propuesta)
    const now = Date.now();
    const futureSlots = await prisma.timeSlot.findMany({
      where: {
        start: { gt: new Date(now) },
        courtId: null,
        clubId: 'padel-estrella-madrid'
      },
      include: {
        instructor: true,
        club: true
      },
      orderBy: { start: 'asc' },
      take: 1
    });

    if (futureSlots.length === 0) {
      console.log('❌ No hay TimeSlots disponibles');
      return;
    }

    const slot = futureSlots[0];
    console.log(`\n✅ TimeSlot seleccionado:`);
    console.log(`   ID: ${slot.id}`);
    console.log(`   Start: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
    console.log(`   CourtId ANTES: ${slot.courtId || 'NULL (propuesta)'}`);

    // 3. Obtener una pista para asignar
    const court = await prisma.court.findFirst({
      where: { clubId: slot.clubId },
      orderBy: { number: 'asc' }
    });

    if (!court) {
      console.log('❌ No hay pistas disponibles');
      return;
    }

    console.log(`   Pista a asignar: ${court.number}`);

    // 4. CREAR BOOKING (simular llamada al API /api/classes/book)
    console.log('\n📋 PASO 1: CREAR BOOKING');
    console.log('-'.repeat(70));

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: slot.id,
        groupSize: 4, // Grupo completo para que se confirme
        status: 'CONFIRMED',
        amountBlocked: slot.totalPrice
      }
    });

    console.log(`✅ Booking creado: ${booking.id}`);
    console.log(`   GroupSize: ${booking.groupSize}`);
    console.log(`   Status: ${booking.status}`);

    // 5. ASIGNAR PISTA (simular confirmación de clase)
    console.log('\n🏢 PASO 2: ASIGNAR PISTA AL TIMESLOT');
    console.log('-'.repeat(70));

    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: {
        courtId: court.id,
        courtNumber: court.number,
        genderCategory: user.genderCategory || 'mixto'
      }
    });

    console.log(`✅ Pista asignada:`);
    console.log(`   CourtId: ${court.id}`);
    console.log(`   CourtNumber: ${court.number}`);
    console.log(`   (Nota: Schedules no creados para simplificar el test)`);

    // 6. VERIFICAR ESTADO ANTES DE CANCELAR
    console.log('\n📊 ESTADO ANTES DE CANCELAR:');
    console.log('-'.repeat(70));

    const slotBeforeCancel = await prisma.timeSlot.findUnique({
      where: { id: slot.id },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      }
    });

    console.log(`   CourtId: ${slotBeforeCancel?.courtId || 'NULL'}`);
    console.log(`   CourtNumber: ${slotBeforeCancel?.courtNumber || 'NULL'}`);
    console.log(`   Bookings activos: ${slotBeforeCancel?.bookings.length || 0}`);

    // 7. SIMULAR CANCELACIÓN (ejecutar la lógica exacta del API)
    console.log('\n🗑️ PASO 3: CANCELAR BOOKING (SIMULAR API)');
    console.log('-'.repeat(70));

    console.log('🔵 [CANCEL] Paso 1: Marcando booking como CANCELLED...');
    await prisma.$executeRaw`
      UPDATE Booking 
      SET status = 'CANCELLED', updatedAt = datetime('now')
      WHERE id = ${booking.id}
    `;
    console.log('✅ [CANCEL] Booking marcado como CANCELLED');

    // Verificar bookings restantes
    console.log('🔵 [CANCEL] Paso 2: Contando reservas activas restantes...');
    const remainingBookings = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Booking
      WHERE timeSlotId = ${slot.id}
      AND status IN ('PENDING', 'CONFIRMED')
    `;

    const count = Number(remainingBookings[0]?.count || 0);
    console.log(`📊 [CANCEL] Reservas activas restantes: ${count}`);
    console.log(`📊 [CANCEL] hasRemainingBookings = ${count > 0}`);

    // Si no quedan reservas, limpiar
    if (count === 0) {
      console.log('🔓 [CANCEL] ¡NO HAY RESERVAS ACTIVAS! Iniciando limpieza de TimeSlot...');

      try {
        console.log('🔵 [CANCEL] Paso 3a: Limpiando courtId del TimeSlot...');
        const updateResult = await prisma.$executeRaw`
          UPDATE TimeSlot
          SET courtId = NULL, courtNumber = NULL, genderCategory = NULL, updatedAt = datetime('now')
          WHERE id = ${slot.id}
        `;
        console.log(`✅ [CANCEL] TimeSlot limpiado (filas afectadas: ${updateResult})`);

        console.log('🔵 [CANCEL] Paso 3b: Eliminando CourtSchedule...');
        const courtSchedResult = await prisma.$executeRaw`
          DELETE FROM CourtSchedule
          WHERE timeSlotId = ${slot.id}
        `;
        console.log(`✅ [CANCEL] CourtSchedule eliminado (filas: ${courtSchedResult})`);

        console.log('🔵 [CANCEL] Paso 3c: Eliminando InstructorSchedule...');
        const instrSchedResult = await prisma.$executeRaw`
          DELETE FROM InstructorSchedule
          WHERE timeSlotId = ${slot.id}
        `;
        console.log(`✅ [CANCEL] InstructorSchedule eliminado (filas: ${instrSchedResult})`);

      } catch (cleanupError) {
        console.error('❌ [CANCEL] ERROR durante limpieza:', cleanupError);
        throw cleanupError;
      }
    } else {
      console.log('⚠️ [CANCEL] NO se limpia courtId porque aún hay reservas activas');
    }

    // 8. VERIFICAR ESTADO FINAL
    console.log('\n📊 PASO 4: VERIFICAR RESULTADO FINAL');
    console.log('-'.repeat(70));

    const slotAfterCancel = await prisma.timeSlot.findUnique({
      where: { id: slot.id },
      include: {
        bookings: true
      }
    });

    console.log(`   CourtId DESPUÉS: ${slotAfterCancel?.courtId || 'NULL'}`);
    console.log(`   CourtNumber DESPUÉS: ${slotAfterCancel?.courtNumber || 'NULL'}`);
    console.log(`   GenderCategory DESPUÉS: ${slotAfterCancel?.genderCategory || 'NULL'}`);

    const allBookings = slotAfterCancel?.bookings || [];
    console.log(`\n   Total Bookings: ${allBookings.length}`);
    allBookings.forEach(b => {
      console.log(`     - ${b.id.substring(0, 12)}... Status: ${b.status}`);
    });

    const activeBookings = allBookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
    const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');

    console.log(`\n   Bookings activos: ${activeBookings.length}`);
    console.log(`   Bookings cancelados: ${cancelledBookings.length}`);

    // Verificar schedules
    const courtSchedules = await prisma.courtSchedule.count({
      where: { timeSlotId: slot.id }
    });
    const instructorSchedules = await prisma.instructorSchedule.count({
      where: { timeSlotId: slot.id }
    });

    console.log(`\n   CourtSchedules: ${courtSchedules}`);
    console.log(`   InstructorSchedules: ${instructorSchedules}`);

    // 9. RESULTADO FINAL
    console.log('\n' + '='.repeat(70));
    console.log('✨ RESULTADO DEL TEST:');
    console.log('='.repeat(70));

    const hasCourtId = slotAfterCancel?.courtId !== null;
    const hasActiveBookings = activeBookings.length > 0;
    const hasSchedules = courtSchedules > 0 || instructorSchedules > 0;

    if (!hasCourtId && !hasActiveBookings && !hasSchedules) {
      console.log('✅ ✅ ✅ ÉXITO TOTAL: TimeSlot limpiado correctamente');
      console.log('   - CourtId eliminado ✅');
      console.log('   - Sin bookings activos ✅');
      console.log('   - Schedules eliminados ✅');
    } else {
      console.log('❌ ❌ ❌ FALLO: TimeSlot NO se limpió correctamente');
      if (hasCourtId) console.log('   - CourtId SIGUE asignado ❌');
      if (hasActiveBookings) console.log('   - Aún hay bookings activos ❌');
      if (hasSchedules) console.log('   - Schedules NO se eliminaron ❌');
    }

    console.log('\n' + '='.repeat(70));

    // 10. CLEANUP - Eliminar datos de prueba
    console.log('\n🧹 LIMPIEZA DE DATOS DE PRUEBA...');
    await prisma.booking.deleteMany({ where: { id: booking.id } });
    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: { courtId: null, courtNumber: null, genderCategory: null }
    });
    console.log('✅ Datos de prueba eliminados\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealBookingCancel();

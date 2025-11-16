/**
 * Test de cancelación con logs detallados
 * Verifica que el flujo de cancelación limpia correctamente el courtId
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 TEST: CANCELACIÓN CON LOGS DETALLADOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Buscar la última reserva activa del usuario Alex García
    console.log('\n📋 PASO 1: Buscando última reserva activa...');
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Alex' } },
          { email: { contains: 'alex' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ Usuario Alex no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);

    const activeBooking = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        timeSlot: {
          include: {
            instructor: true,
            club: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeBooking) {
      console.log('❌ No hay reservas activas para este usuario');
      return;
    }

    console.log(`✅ Reserva encontrada:`);
    console.log(`   - ID: ${activeBooking.id}`);
    console.log(`   - TimeSlot ID: ${activeBooking.timeSlotId}`);
    console.log(`   - Status: ${activeBooking.status}`);
    console.log(`   - Start: ${new Date(activeBooking.timeSlot.start).toLocaleString('es-ES')}`);
    console.log(`   - CourtId: ${activeBooking.timeSlot.courtId || 'NULL (propuesta)'}`);
    console.log(`   - CourtNumber: ${activeBooking.timeSlot.courtNumber || 'NULL'}`);

    // 2. Contar todas las reservas activas de ese TimeSlot ANTES de cancelar
    console.log('\n📋 PASO 2: Contando reservas activas del TimeSlot...');
    
    const bookingsBefore = await prisma.booking.findMany({
      where: {
        timeSlotId: activeBooking.timeSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    console.log(`   Total reservas activas ANTES: ${bookingsBefore.length}`);
    bookingsBefore.forEach((b, idx) => {
      console.log(`   ${idx + 1}. Booking ${b.id.substring(0, 12)}... - Status: ${b.status}`);
    });

    // 3. SIMULAR CANCELACIÓN (marcar como CANCELLED)
    console.log('\n🔵 PASO 3: Marcando booking como CANCELLED...');
    
    await prisma.$executeRaw`
      UPDATE Booking 
      SET status = 'CANCELLED', updatedAt = datetime('now')
      WHERE id = ${activeBooking.id}
    `;
    
    console.log('✅ Booking marcado como CANCELLED');

    // 4. Contar reservas activas DESPUÉS de cancelar
    console.log('\n📋 PASO 4: Contando reservas activas DESPUÉS de cancelar...');
    
    const remainingBookings = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Booking
      WHERE timeSlotId = ${activeBooking.timeSlotId}
      AND status IN ('PENDING', 'CONFIRMED')
    `;
    
    const count = Number(remainingBookings[0]?.count || 0);
    console.log(`   Reservas activas restantes: ${count}`);
    console.log(`   ¿Debe limpiar courtId? ${count === 0 ? 'SÍ ✅' : 'NO ❌'}`);

    // 5. Si no quedan reservas, LIMPIAR courtId
    if (count === 0) {
      console.log('\n🔓 PASO 5: Limpiando courtId del TimeSlot...');
      
      try {
        const updateResult = await prisma.$executeRaw`
          UPDATE TimeSlot
          SET courtId = NULL, courtNumber = NULL, genderCategory = NULL, updatedAt = datetime('now')
          WHERE id = ${activeBooking.timeSlotId}
        `;
        
        console.log(`✅ TimeSlot limpiado (filas afectadas: ${updateResult})`);

        // Verificar que se limpió
        const updatedSlot = await prisma.timeSlot.findUnique({
          where: { id: activeBooking.timeSlotId }
        });

        console.log('\n📊 Estado final del TimeSlot:');
        console.log(`   - CourtId: ${updatedSlot?.courtId || 'NULL ✅'}`);
        console.log(`   - CourtNumber: ${updatedSlot?.courtNumber || 'NULL ✅'}`);
        console.log(`   - GenderCategory: ${updatedSlot?.genderCategory || 'NULL ✅'}`);

        // Limpiar schedules
        console.log('\n🔵 Limpiando CourtSchedule...');
        const courtResult = await prisma.$executeRaw`
          DELETE FROM CourtSchedule WHERE timeSlotId = ${activeBooking.timeSlotId}
        `;
        console.log(`✅ CourtSchedule eliminado (${courtResult} filas)`);

        console.log('🔵 Limpiando InstructorSchedule...');
        const instrResult = await prisma.$executeRaw`
          DELETE FROM InstructorSchedule WHERE timeSlotId = ${activeBooking.timeSlotId}
        `;
        console.log(`✅ InstructorSchedule eliminado (${instrResult} filas)`);

      } catch (cleanupError) {
        console.error('❌ ERROR durante limpieza:', cleanupError);
      }
    } else {
      console.log('\n⚠️ PASO 5: NO se limpia courtId porque aún hay reservas activas');
    }

    // 6. Verificar estado final completo
    console.log('\n📊 VERIFICACIÓN FINAL:');
    
    const finalBookings = await prisma.booking.findMany({
      where: { timeSlotId: activeBooking.timeSlotId }
    });

    console.log(`\n   Bookings totales: ${finalBookings.length}`);
    finalBookings.forEach(b => {
      console.log(`   - ${b.id.substring(0, 12)}... Status: ${b.status}`);
    });

    const finalSlot = await prisma.timeSlot.findUnique({
      where: { id: activeBooking.timeSlotId }
    });

    console.log(`\n   TimeSlot:`);
    console.log(`   - CourtId: ${finalSlot?.courtId || 'NULL'}`);
    console.log(`   - CourtNumber: ${finalSlot?.courtNumber || 'NULL'}`);
    
    const hasCourtId = finalSlot?.courtId !== null;
    const hasActiveBookings = finalBookings.some(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
    
    console.log('\n✨ RESULTADO:');
    if (!hasCourtId && !hasActiveBookings) {
      console.log('   ✅ CORRECTO: TimeSlot SIN courtId y SIN reservas activas');
    } else if (hasCourtId && !hasActiveBookings) {
      console.log('   ❌ ERROR: TimeSlot CON courtId pero SIN reservas activas (HUÉRFANO)');
    } else if (hasCourtId && hasActiveBookings) {
      console.log('   ✅ CORRECTO: TimeSlot CON courtId y CON reservas activas');
    } else {
      console.log('   ✅ CORRECTO: TimeSlot SIN courtId (propuesta)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completado\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

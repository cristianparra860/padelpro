// Script para probar el sistema de plazas recicladas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRecycledSpots() {
  try {
    console.log('\n🧪 === TEST: SISTEMA DE PLAZAS RECICLADAS ===\n');

    // 1. Buscar una clase confirmada con pista asignada
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        ts.courtNumber,
        ts.maxPlayers,
        i.name as instructorName
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NOT NULL
      ORDER BY ts.start DESC
      LIMIT 1
    `;

    if (confirmedClasses.length === 0) {
      console.log('❌ No hay clases confirmadas. Crea una reserva primero.');
      return;
    }

    const confirmedClass = confirmedClasses[0];
    const start = new Date(Number(confirmedClass.start));
    console.log('📍 CLASE CONFIRMADA:');
    console.log(`   Instructor: ${confirmedClass.instructorName}`);
    console.log(`   Horario: ${start.toLocaleString('es-ES')}`);
    console.log(`   Pista: ${confirmedClass.courtNumber}`);
    console.log(`   ID: ${confirmedClass.id}\n`);

    // 2. Ver bookings actuales
    const allBookings = await prisma.booking.findMany({
      where: { timeSlotId: confirmedClass.id },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('📊 BOOKINGS ACTUALES:');
    allBookings.forEach((b, idx) => {
      const status = b.status === 'CANCELLED' ? '❌ CANCELADO' : b.status === 'CONFIRMED' ? '✅ CONFIRMADO' : '⏳ PENDIENTE';
      const recycled = b.isRecycled ? '♻️ RECICLADA' : '';
      console.log(`   ${idx + 1}. ${b.user.name} - ${b.groupSize}p - ${status} ${recycled}`);
    });

    const activeBookings = allBookings.filter(b => b.status !== 'CANCELLED');
    const recycledBookings = allBookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
    const totalRecycledSpots = recycledBookings.reduce((sum, b) => sum + b.groupSize, 0);

    console.log(`\n📈 RESUMEN:`);
    console.log(`   Capacidad total: ${confirmedClass.maxPlayers} jugadores`);
    console.log(`   Reservas activas: ${activeBookings.length} bookings`);
    console.log(`   Plazas ocupadas: ${activeBookings.reduce((sum, b) => sum + b.groupSize, 0)} jugadores`);
    console.log(`   Plazas recicladas: ${totalRecycledSpots} jugadores (${recycledBookings.length} bookings)\n`);

    // 3. Verificar cómo se mostraría en el panel
    console.log('🎯 COMPORTAMIENTO ESPERADO EN PANEL:\n');
    
    if (totalRecycledSpots > 0) {
      console.log(`✅ La clase DEBE aparecer en el panel principal con:`);
      console.log(`   - Pista ${confirmedClass.courtNumber} asignada`);
      console.log(`   - Badge de regalo mostrando "${totalRecycledSpots}p"`);
      console.log(`   - Solo reservable con PUNTOS`);
      console.log(`   - Opciones de groupSize filtradas por plazas disponibles\n`);
    } else {
      console.log(`ℹ️ La clase NO tiene plazas recicladas:`);
      console.log(`   - Se muestra normal si hay plazas libres`);
      console.log(`   - O completa si está llena\n`);
    }

    // 4. Simular cancelación de un booking
    const firstActiveBooking = activeBookings[0];
    if (firstActiveBooking) {
      console.log('🧪 SIMULACIÓN: ¿Qué pasaría si cancelo un booking?\n');
      console.log(`   Booking a cancelar: ${firstActiveBooking.user.name} (${firstActiveBooking.groupSize}p)`);
      console.log(`   Estado actual: ${firstActiveBooking.status}`);
      console.log(`\n   ➡️ Al cancelar desde admin:`);
      console.log(`      1. Booking marcado como CANCELLED`);
      console.log(`      2. isRecycled = true`);
      console.log(`      3. Pista ${confirmedClass.courtNumber} SE MANTIENE asignada`);
      console.log(`      4. Plaza liberada aparece en panel con icono 🎁`);
      console.log(`      5. Solo reservable con puntos\n`);
    }

    // 5. Verificar qué pasa si se cancelan TODOS los bookings
    console.log('🧪 SIMULACIÓN: ¿Qué pasa si se cancelan TODOS los bookings?\n');
    console.log(`   Total bookings activos: ${activeBookings.length}`);
    console.log(`   Total bookings reciclados: ${recycledBookings.length}`);
    console.log(`\n   ➡️ Al cancelar el último booking activo:`);
    if (recycledBookings.length > 0) {
      console.log(`      ❌ INCORRECTO: courtId NO se limpia (hay ${recycledBookings.length} reciclado(s))`);
      console.log(`      ✅ Clase se mantiene visible con plazas recicladas`);
    } else {
      console.log(`      1. Se verifica: remainingActiveBookings = 0`);
      console.log(`      2. Se verifica: recycledBookings = 0`);
      console.log(`      3. ✅ courtId = NULL (clase se libera completamente)`);
      console.log(`      4. ✅ Schedules eliminados`);
      console.log(`      5. ✅ Clase vuelve a propuesta disponible\n`);
    }

    console.log('='.repeat(70));
    console.log('📝 CONCLUSIÓN:\n');
    console.log('El sistema de reciclaje funciona así:');
    console.log('1. Cancelar reserva confirmada → Plaza reciclada (solo puntos)');
    console.log('2. Pista SIEMPRE mantiene courtId mientras haya plazas activas/recicladas');
    console.log('3. Solo se libera completamente si NO hay bookings (ni activos ni reciclados)');
    console.log('4. Panel muestra badge 🎁 con número de plazas recicladas disponibles\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecycledSpots();

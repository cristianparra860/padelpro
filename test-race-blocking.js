const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRaceBlocking() {
  console.log('\n🏁 TEST: Sistema de bloqueo de carrera de reservas\n');

  try {
    // 1. Buscar una clase activa (sin pista asignada)
    const activeClass = await prisma.$queryRaw`
      SELECT id, start, level, instructorId, courtNumber, totalPrice
      FROM TimeSlot 
      WHERE courtNumber IS NULL
      AND date(start) = date('now')
      LIMIT 1
    `;

    if (!activeClass || activeClass.length === 0) {
      console.log('❌ No hay clases activas disponibles para probar');
      return;
    }

    const timeSlotId = activeClass[0].id;
    console.log(`✅ Clase encontrada: ${timeSlotId}`);
    console.log(`   Hora: ${activeClass[0].start}`);
    console.log(`   Nivel: ${activeClass[0].level}`);
    console.log(`   Pista: ${activeClass[0].courtNumber || 'Sin asignar'}`);

    // 2. Verificar reservas actuales
    const currentBookings = await prisma.$queryRaw`
      SELECT id, userId, groupSize, status
      FROM Booking
      WHERE timeSlotId = ${timeSlotId}
    `;

    console.log(`\n📋 Reservas actuales: ${currentBookings.length}`);
    
    // Agrupar por groupSize
    const byGroupSize = {};
    currentBookings.forEach(booking => {
      const size = booking.groupSize;
      if (!byGroupSize[size]) byGroupSize[size] = [];
      byGroupSize[size].push(booking);
    });

    Object.entries(byGroupSize).forEach(([size, bookings]) => {
      console.log(`   Opción ${size} jugador(es): ${bookings.length} reservas (${bookings[0].status})`);
    });

    // 3. Verificar si hay un ganador
    let winner = null;
    for (const [size, bookings] of Object.entries(byGroupSize)) {
      if (bookings.length >= parseInt(size)) {
        winner = size;
        break;
      }
    }

    if (winner) {
      console.log(`\n🏆 GANADOR DETECTADO: Opción de ${winner} jugador(es)`);
      
      // Verificar pista asignada
      const updatedClass = await prisma.$queryRaw`
        SELECT courtNumber FROM TimeSlot WHERE id = ${timeSlotId}
      `;
      
      console.log(`   Pista asignada: ${updatedClass[0].courtNumber || 'Sin asignar'}`);

      // Verificar reservas canceladas
      const cancelledBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Booking
        WHERE timeSlotId = ${timeSlotId}
        AND status = 'CANCELLED'
      `;

      console.log(`   Reservas canceladas: ${cancelledBookings[0].count}`);

      // Verificar que la clase YA NO aparece en la lista de disponibles
      const stillVisible = await prisma.$queryRaw`
        SELECT id FROM TimeSlot 
        WHERE id = ${timeSlotId}
        AND courtNumber IS NULL
      `;

      if (stillVisible.length === 0) {
        console.log(`   ✅ La clase YA NO es visible en nuevas tarjetas (bloqueada correctamente)`);
      } else {
        console.log(`   ⚠️ La clase TODAVÍA es visible (ERROR: debería estar bloqueada)`);
      }

    } else {
      console.log(`\n⏳ No hay ganador aún - la carrera continúa`);
    }

    // 4. Resumen de estado
    console.log(`\n📊 RESUMEN:`);
    console.log(`   TimeSlot ID: ${timeSlotId}`);
    console.log(`   Total reservas: ${currentBookings.length}`);
    console.log(`   Opciones activas: ${Object.keys(byGroupSize).length}`);
    console.log(`   Estado: ${winner ? '🏆 COMPLETADA' : '⏳ EN PROGRESO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRaceBlocking();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetTest() {
  try {
    console.log('🧹 LIMPIANDO RESERVAS DE PRUEBA\n');
    
    // ID de Marc
    const marcId = 'user-1763677035576-wv1t7iun0';
    const today = '2025-12-05';
    
    // 1. Buscar reservas de Marc hoy
    const todayBookings = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marcId}
      AND ts.start LIKE ${today + '%'}
    `;
    
    console.log(`📊 Reservas de Marc el ${today}:`, todayBookings.length);
    
    if (todayBookings.length > 0) {
      todayBookings.forEach((b, i) => {
        const time = new Date(b.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        const court = b.courtNumber ? `Pista ${b.courtNumber}` : 'Sin pista';
        console.log(`   ${i+1}. ${time} - ${b.status} - ${court} (${b.id})`);
      });
      
      // 2. Cancelar todas
      console.log('\n🗑️ Cancelando todas las reservas...');
      for (const booking of todayBookings) {
        await prisma.$executeRaw`
          UPDATE Booking 
          SET status = 'CANCELLED', updatedAt = datetime('now')
          WHERE id = ${booking.id}
        `;
        console.log(`   ✅ Cancelada: ${booking.id}`);
      }
      
      console.log('\n✅ Reservas limpiadas');
    } else {
      console.log('   ℹ️ No hay reservas para cancelar');
    }
    
    // 3. Buscar TimeSlots disponibles hoy
    console.log(`\n📅 Buscando clases disponibles el ${today}...\n`);
    
    const availableSlots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.instructorId,
        COUNT(b.id) as currentBookings
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status = 'PENDING'
      WHERE ts.start LIKE ${today + '%'}
      AND ts.courtId IS NULL
      GROUP BY ts.id
      HAVING COUNT(b.id) < 4
      ORDER BY ts.start
      LIMIT 5
    `;
    
    console.log(`📋 Clases disponibles: ${availableSlots.length}\n`);
    
    if (availableSlots.length >= 3) {
      console.log('✅ Hay suficientes clases para la prueba (necesitamos 3)');
      console.log('\n📝 TimeSlots seleccionados para la prueba:\n');
      
      availableSlots.slice(0, 3).forEach((slot, i) => {
        const time = new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        console.log(`   ${i+1}. ${time} - ${slot.currentBookings}/4 inscritos`);
        console.log(`      ID: ${slot.id}`);
      });
      
      console.log('\n💡 Siguiente paso: Inscribir a Marc en estas 3 clases');
    } else {
      console.log('⚠️ No hay suficientes clases disponibles para la prueba');
      console.log('   Se necesitan al menos 3 clases del mismo día');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetTest();

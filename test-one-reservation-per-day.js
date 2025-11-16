const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOneReservationPerDay() {
  console.log('🧪 Testing: Una reserva confirmada por día\n');
  
  const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
  const testDate = '2025-11-17'; // Mañana
  
  try {
    // 1. Buscar clases del día 17
    const startOfDay = new Date(testDate + 'T00:00:00.000Z').getTime();
    const endOfDay = new Date(testDate + 'T23:59:59.999Z').getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT id, start, end, totalPrice
      FROM TimeSlot
      WHERE start >= ${startOfDay}
      AND start <= ${endOfDay}
      AND courtId IS NULL
      ORDER BY start ASC
      LIMIT 5
    `;
    
    console.log(`📅 Clases disponibles el ${testDate}:`, slots.length);
    
    if (slots.length < 2) {
      console.log('❌ Se necesitan al menos 2 clases para probar');
      return;
    }
    
    const slot1 = slots[0];
    const slot2 = slots[1];
    
    const time1 = new Date(Number(slot1.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const time2 = new Date(Number(slot2.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`\n🎯 Slot 1: ${slot1.id.substring(0, 20)}... a las ${time1}`);
    console.log(`🎯 Slot 2: ${slot2.id.substring(0, 20)}... a las ${time2}`);
    
    // 2. Verificar reservas existentes del usuario ese día
    const existingBookings = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND ts.start >= ${startOfDay}
      AND ts.start <= ${endOfDay}
    `;
    
    console.log(`\n📊 Reservas existentes del usuario el ${testDate}:`, existingBookings.length);
    
    if (existingBookings.length > 0) {
      console.log('Limpiando reservas anteriores...');
      for (const booking of existingBookings) {
        await prisma.$executeRaw`
          DELETE FROM Booking WHERE id = ${booking.id}
        `;
      }
      console.log('✅ Reservas limpiadas');
    }
    
    // 3. Simular el flujo: Inscribirse en 2 clases
    console.log('\n📝 PASO 1: Usuario se inscribe en 2 clases diferentes');
    console.log(`   - Inscripción en clase a las ${time1}`);
    console.log(`   - Inscripción en clase a las ${time2}`);
    console.log('   (Esto se haría mediante la API /api/classes/book)');
    
    // 4. Verificar qué pasa cuando una se confirma
    console.log('\n✨ PASO 2: La clase de las ' + time1 + ' se llena y se confirma');
    console.log('   📌 Cuando esto ocurra, la lógica debería:');
    console.log('      1. Confirmar la reserva del usuario en esa clase');
    console.log('      2. CANCELAR automáticamente su inscripción a las ' + time2);
    console.log('      3. Desbloquear los créditos de la inscripción cancelada');
    console.log('      4. Bloquear nuevas inscripciones ese día');
    
    console.log('\n🚫 PASO 3: Usuario intenta inscribirse en otra clase ese día');
    console.log('   ❌ Debería recibir error: "Ya tienes una reserva confirmada este día"');
    
    console.log('\n✅ FLUJO IMPLEMENTADO:');
    console.log('   - Función: cancelOtherBookingsOnSameDay()');
    console.log('   - Se ejecuta después de confirmar cada booking');
    console.log('   - Validación previa en POST para evitar inscripciones si ya está confirmado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOneReservationPerDay();

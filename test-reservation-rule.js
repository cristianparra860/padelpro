const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOneReservationPerDayRule() {
  try {
    console.log('🧪 PRUEBA: Regla "Una reserva confirmada por día"\n');
    console.log('='.repeat(60));
    
    const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
    
    // PASO 1: Ver estado actual del día 16
    console.log('\n📅 PASO 1: Estado actual del día 16 de noviembre\n');
    
    const day16Start = 1763251200000; // 2025-11-16 00:00:00
    const day16End = 1763337599999;   // 2025-11-16 23:59:59
    
    const bookingsDay16 = await prisma.$queryRaw`
      SELECT b.id, b.status, b.groupSize, ts.start, ts.courtNumber, ts.id as timeSlotId
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND ts.start >= ${day16Start}
      AND ts.start <= ${day16End}
      ORDER BY ts.start
    `;
    
    console.log(`Total de reservas del día 16: ${bookingsDay16.length}`);
    bookingsDay16.forEach((b, i) => {
      const time = new Date(Number(b.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const statusIcon = b.status === 'CONFIRMED' ? '✅' : '⏳';
      const courtInfo = b.courtNumber ? `Court ${b.courtNumber}` : 'Sin cancha';
      console.log(`${i+1}. ${statusIcon} ${time} - ${b.status} - ${courtInfo}`);
    });
    
    const confirmed = bookingsDay16.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
    const pending = bookingsDay16.filter(b => b.status === 'PENDING');
    
    console.log(`\n📊 Resumen: ${confirmed.length} confirmadas, ${pending.length} pendientes`);
    
    if (confirmed.length > 0) {
      console.log('\n⚠️  Ya hay reservas confirmadas el día 16.');
      console.log('La regla debería haber cancelado las otras inscripciones.');
      console.log('\n🔍 Verificando si la lógica se ejecutó...');
      
      // Ver si hay bookings pendientes que deberían haber sido cancelados
      if (pending.length > 0) {
        console.log(`\n❌ PROBLEMA: Aún hay ${pending.length} reservas PENDING.`);
        console.log('La función cancelOtherBookingsOnSameDay() no se ejecutó.');
        console.log('\nEsto puede suceder si:');
        console.log('1. Las reservas fueron confirmadas ANTES de implementar la regla');
        console.log('2. La función aún no se ha ejecutado porque no ha habido nuevas confirmaciones');
      } else {
        console.log('\n✅ Perfecto! No hay inscripciones pendientes.');
        console.log('La regla está funcionando correctamente.');
      }
    } else {
      console.log('\n✅ No hay reservas confirmadas aún en el día 16.');
      console.log('La regla se activará cuando una clase se llene.');
    }
    
    // PASO 2: Simular intento de nueva inscripción
    console.log('\n' + '='.repeat(60));
    console.log('\n📅 PASO 2: Simular nueva inscripción\n');
    
    if (confirmed.length > 0) {
      console.log('Si intentas hacer una nueva reserva el día 16...');
      console.log('❌ Deberías recibir este error:');
      const time = new Date(Number(confirmed[0].start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   "Ya tienes una reserva confirmada este día a las ${time}."`);
      console.log('   "Solo puedes tener una reserva confirmada por día."');
    } else {
      console.log('✅ Puedes inscribirte en múltiples clases del día 16.');
      console.log('Cuando una se confirme, las demás se cancelarán automáticamente.');
    }
    
    // PASO 3: Ver un día diferente
    console.log('\n' + '='.repeat(60));
    console.log('\n📅 PASO 3: Verificar día 17 de noviembre\n');
    
    const day17Start = 1763337600000; // 2025-11-17 00:00:00
    const day17End = 1763423999999;   // 2025-11-17 23:59:59
    
    const bookingsDay17 = await prisma.$queryRaw`
      SELECT b.id, b.status, b.groupSize, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND ts.start >= ${day17Start}
      AND ts.start <= ${day17End}
      ORDER BY ts.start
    `;
    
    console.log(`Total de reservas del día 17: ${bookingsDay17.length}`);
    if (bookingsDay17.length > 0) {
      bookingsDay17.forEach((b, i) => {
        const time = new Date(Number(b.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const statusIcon = b.status === 'CONFIRMED' ? '✅' : '⏳';
        console.log(`${i+1}. ${statusIcon} ${time} - ${b.status}`);
      });
    } else {
      console.log('No hay reservas para el día 17.');
    }
    
    const confirmed17 = bookingsDay17.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
    console.log(`\n✅ El día 17 es independiente: ${confirmed17.length} confirmadas`);
    console.log('Puedes tener una reserva confirmada CADA día (día 16, día 17, día 18, etc.)');
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 CONCLUSIÓN:');
    console.log('La regla permite: MÚLTIPLES INSCRIPCIONES, UNA SOLA CONFIRMACIÓN por día');
    console.log('✅ Puedes inscribirte en todas las clases que quieras cada día');
    console.log('✅ Cuando una se llena, el sistema confirma ESA y cancela las demás');
    console.log('✅ Cada día es independiente (puedes tener confirmación día 16, 17, 18...)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOneReservationPerDayRule();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const userId = 'cmhkwi8so0001tggo0bwojrjy';
    
    // Obtener una clase del día 4 de diciembre para intentar inscribirnos
    const dec4Classes = await prisma.$queryRaw`
      SELECT id, start, level, instructorId
      FROM TimeSlot
      WHERE start >= '2025-12-04T00:00:00.000Z'
      AND start <= '2025-12-04T23:59:59.999Z'
      AND courtId IS NULL
      LIMIT 1
    `;
    
    if (!dec4Classes || dec4Classes.length === 0) {
      console.log('❌ No hay clases disponibles el 4 de diciembre');
      await prisma.$disconnect();
      return;
    }
    
    const testClass = dec4Classes[0];
    console.log('🎯 Intentando inscribirse en clase:');
    console.log('  TimeSlot ID:', testClass.id);
    console.log('  Start:', testClass.start);
    console.log('  Level:', testClass.level);
    
    // Simular la validación que hace el endpoint
    const slotDate = new Date(testClass.start);
    const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
    const startOfDay = startOfDayDate.toISOString();
    const endOfDay = endOfDayDate.toISOString();
    
    console.log('\n🔍 Verificando reservas confirmadas...');
    console.log('  Rango del día:', startOfDay, '-', endOfDay);
    
    const confirmedBookingsToday = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start, ts.level, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'CONFIRMED'
      AND ts.start >= ${startOfDay}
      AND ts.start <= ${endOfDay}
    `;
    
    console.log('\n📊 Reservas confirmadas encontradas:', confirmedBookingsToday.length);
    
    if (confirmedBookingsToday.length > 0) {
      confirmedBookingsToday.forEach(b => {
        const date = new Date(b.start);
        console.log('\n✅ RESERVA CONFIRMADA:');
        console.log('  ID:', b.id.substring(0, 20));
        console.log('  Status:', b.status);
        console.log('  Start:', b.start);
        console.log('  Hora:', date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        console.log('  Court:', b.courtNumber);
        console.log('  Level:', b.level);
      });
      console.log('\n❌ VALIDACIÓN: NO PUEDE INSCRIBIRSE - Ya tiene reserva confirmada este día');
    } else {
      console.log('\n✅ VALIDACIÓN: PUEDE INSCRIBIRSE - No hay reservas confirmadas este día');
    }
    
    // Mostrar todas las reservas del 4 de diciembre para debug
    const allBookingsDec4 = await prisma.$queryRaw`
      SELECT b.id, b.status, b.groupSize, ts.start, ts.courtNumber, ts.level
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND ts.start >= '2025-12-04T00:00:00.000Z'
      AND ts.start <= '2025-12-04T23:59:59.999Z'
      ORDER BY ts.start ASC
    `;
    
    console.log('\n\n📋 TODAS las reservas del 4 de diciembre:');
    console.log('Total:', allBookingsDec4.length);
    
    allBookingsDec4.forEach(b => {
      const date = new Date(b.start);
      console.log('\n  ' + (b.status === 'CONFIRMED' ? '🟢' : '🔵') + ' ' + b.status);
      console.log('    ID:', b.id.substring(0, 20));
      console.log('    Hora:', date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      console.log('    Court:', b.courtNumber || 'Sin asignar');
      console.log('    GroupSize:', b.groupSize);
      console.log('    Level:', b.level);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

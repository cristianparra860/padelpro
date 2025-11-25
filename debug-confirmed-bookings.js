const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const userId = 'cmhkwi8so0001tggo0bwojrjy';
    
    console.log('🔍 Buscando reservas confirmadas...\n');
    
    // Obtener todas las reservas CONFIRMED del usuario
    const confirmed = await prisma.$queryRaw`
      SELECT b.id, b.status, b.groupSize, ts.start, ts.courtNumber, ts.level
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'CONFIRMED'
      ORDER BY ts.start ASC
    `;
    
    console.log('📊 Total reservas confirmadas:', confirmed.length);
    
    confirmed.forEach(b => {
      const startMs = Number(b.start);
      const date = new Date(startMs);
      const dateUTC = new Date(startMs);
      
      console.log('\n📅 Reserva confirmada:');
      console.log('  ID:', b.id.substring(0, 20));
      console.log('  Start (timestamp):', startMs);
      console.log('  Start (local):', date.toLocaleString('es-ES'));
      console.log('  Start (UTC):', dateUTC.toISOString());
      console.log('  Día (local):', date.toLocaleDateString('es-ES'));
      console.log('  Día (UTC):', dateUTC.toISOString().split('T')[0]);
      console.log('  Court:', b.courtNumber);
      console.log('  Level:', b.level);
      
      // Calcular inicio y fin del día (local)
      const startOfDayLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const endOfDayLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
      
      // Calcular inicio y fin del día (UTC)
      const startOfDayUTC = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), 0, 0, 0, 0)).getTime();
      const endOfDayUTC = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate(), 23, 59, 59, 999)).getTime();
      
      console.log('  Rango LOCAL:', startOfDayLocal, '-', endOfDayLocal);
      console.log('  Rango UTC:', startOfDayUTC, '-', endOfDayUTC);
    });
    
    // Obtener todas las reservas PENDING del usuario
    const pending = await prisma.$queryRaw`
      SELECT b.id, b.status, b.groupSize, ts.start, ts.level
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'PENDING'
      ORDER BY ts.start ASC
    `;
    
    console.log('\n\n📊 Total reservas pendientes:', pending.length);
    
    pending.forEach(b => {
      const startMs = Number(b.start);
      const date = new Date(startMs);
      
      console.log('\n⏳ Reserva pendiente:');
      console.log('  ID:', b.id.substring(0, 20));
      console.log('  Start (timestamp):', startMs);
      console.log('  Start (local):', date.toLocaleString('es-ES'));
      console.log('  Start (UTC):', date.toISOString());
      console.log('  Día:', date.toLocaleDateString('es-ES'));
      console.log('  Level:', b.level);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

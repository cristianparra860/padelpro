const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingStructure() {
  console.log('🔍 Analizando estructura de reservas...\n');

  try {
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.groupSize,
        b.status,
        ts.id as timeSlotId,
        ts.start,
        ts.maxPlayers,
        ts.courtNumber,
        u.name as userName
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      JOIN User u ON b.userId = u.id
      WHERE ts.start LIKE '2025-10-17 09:00%'
      OR ts.start LIKE '2025-10-17T09:00%'
      ORDER BY ts.id, b.groupSize
    `;

    console.log(`Encontradas ${bookings.length} reservas para las 09:00 del 17 Oct:\n`);
    
    // Agrupar por timeSlotId
    const byTimeSlot = {};
    bookings.forEach(b => {
      if (!byTimeSlot[b.timeSlotId]) {
        byTimeSlot[b.timeSlotId] = {
          timeSlotId: b.timeSlotId,
          start: b.start,
          maxPlayers: b.maxPlayers,
          courtNumber: b.courtNumber,
          bookings: []
        };
      }
      byTimeSlot[b.timeSlotId].bookings.push(b);
    });

    Object.values(byTimeSlot).forEach((slot, index) => {
      console.log(`\n${index + 1}. TimeSlot: ${slot.timeSlotId.substring(0, 30)}...`);
      console.log(`   📅 Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
      console.log(`   👥 Capacidad máxima: ${slot.maxPlayers} jugadores`);
      console.log(`\n   📋 Reservas (${slot.bookings.length}):`);
      
      // Contar por groupSize
      const byGroupSize = {};
      slot.bookings.forEach(b => {
        if (!byGroupSize[b.groupSize]) {
          byGroupSize[b.groupSize] = [];
        }
        byGroupSize[b.groupSize].push(b);
      });

      Object.keys(byGroupSize).sort().forEach(groupSize => {
        const bookings = byGroupSize[groupSize];
        const totalInGroup = bookings.length * parseInt(groupSize);
        const isComplete = totalInGroup >= parseInt(groupSize);
        
        console.log(`\n      Opción de ${groupSize} jugador(es):`);
        console.log(`      - ${bookings.length} reserva(s) de ${groupSize} jugador(es) cada una`);
        console.log(`      - Total: ${totalInGroup} jugadores`);
        console.log(`      - Estado: ${isComplete ? '✅ COMPLETA' : '⏳ Incompleta'}`);
        
        bookings.forEach(b => {
          console.log(`         • ${b.userName} (groupSize: ${b.groupSize}, status: ${b.status})`);
        });
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingStructure();

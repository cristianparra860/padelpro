const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateRaceSystem() {
  const timeSlotId = 'cmhkwtlua002vtg7gmx4t1tet'; // 10:30
  
  console.log('🏁 Simulando sistema de carreras para TimeSlot 10:30\n');
  
  // 1. Obtener todas las reservas activas
  const allBookingsForSlot = await prisma.$queryRaw`
    SELECT id, userId, groupSize, status, createdAt 
    FROM Booking 
    WHERE timeSlotId = ${timeSlotId} 
    AND status IN ('PENDING', 'CONFIRMED')
  `;
  
  console.log(`📊 Total reservas activas: ${allBookingsForSlot.length}`);
  allBookingsForSlot.forEach(b => {
    console.log(`   - ${b.id}: groupSize=${b.groupSize}, status=${b.status}`);
  });
  
  // 2. Agrupar por groupSize
  const bookingsByGroupSize = new Map();
  allBookingsForSlot.forEach(booking => {
    const currentCount = bookingsByGroupSize.get(booking.groupSize) || 0;
    bookingsByGroupSize.set(booking.groupSize, currentCount + 1);
  });
  
  console.log('\n📈 Reservas agrupadas:');
  for (const [groupSize, count] of bookingsByGroupSize.entries()) {
    console.log(`   Opción ${groupSize} jugador(es): ${count}/${groupSize}`);
  }
  
  // 3. Verificar ganador
  let raceWinner = null;
  for (const [groupSize, count] of bookingsByGroupSize.entries()) {
    if (count >= groupSize) {
      console.log(`\n✅ GANADOR: Opción de ${groupSize} jugador(es)`);
      raceWinner = groupSize;
      break;
    }
  }
  
  if (!raceWinner) {
    console.log('\n⏳ Ningún grupo completado todavía');
    await prisma.$disconnect();
    return;
  }
  
  // 4. Verificar si ya tiene pista asignada
  const currentTimeSlot = await prisma.$queryRaw`
    SELECT courtNumber, clubId, start, end FROM TimeSlot WHERE id = ${timeSlotId}
  `;
  
  const slotData = currentTimeSlot[0];
  console.log(`\nTimeSlot actual:`);
  console.log(`   Pista: ${slotData.courtNumber || 'NULL'}`);
  console.log(`   Club: ${slotData.clubId}`);
  
  if (slotData.courtNumber) {
    console.log('   ℹ️ Ya tiene pista asignada');
    await prisma.$disconnect();
    return;
  }
  
  // 5. Buscar pistas disponibles
  console.log('\n🔍 Buscando pistas disponibles...');
  const { clubId, start, end } = slotData;
  
  const occupiedByClasses = await prisma.$queryRaw`
    SELECT courtNumber FROM TimeSlot 
    WHERE clubId = ${clubId}
    AND courtNumber IS NOT NULL
    AND id != ${timeSlotId}
    AND start < ${end}
    AND end > ${start}
    GROUP BY courtNumber
  `;
  
  const occupiedBySchedule = await prisma.$queryRaw`
    SELECT c.number as courtNumber
    FROM CourtSchedule cs
    JOIN Court c ON cs.courtId = c.id
    WHERE c.clubId = ${clubId}
    AND cs.isOccupied = 1
    AND cs.startTime < ${end}
    AND cs.endTime > ${start}
  `;
  
  const occupiedCourtNumbers = [
    ...occupiedByClasses.map(c => c.courtNumber),
    ...occupiedBySchedule.map(c => c.courtNumber)
  ];
  
  console.log(`   Pistas ocupadas:`, occupiedCourtNumbers);
  
  // 6. Obtener pistas del club
  const clubCourts = await prisma.$queryRaw`
    SELECT number FROM Court 
    WHERE clubId = ${clubId}
    AND isActive = 1
    ORDER BY number ASC
  `;
  
  console.log(`   Total pistas activas: ${clubCourts.length}`);
  
  // 7. Encontrar primera disponible
  let courtAssigned = null;
  for (const court of clubCourts) {
    if (!occupiedCourtNumbers.includes(court.number)) {
      courtAssigned = court.number;
      console.log(`   ✅ Primera pista disponible: Pista ${courtAssigned}`);
      break;
    }
  }
  
  if (!courtAssigned) {
    console.log('   ❌ NO HAY PISTAS DISPONIBLES');
    await prisma.$disconnect();
    return;
  }
  
  // 8. Obtener courtId
  console.log('\n🎯 Asignando pista...');
  const courtInfo = await prisma.$queryRaw`
    SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = ${clubId} LIMIT 1
  `;
  
  console.log(`   Court query result:`, courtInfo);
  
  const assignedCourtId = courtInfo && courtInfo.length > 0 ? courtInfo[0].id : null;
  
  if (assignedCourtId) {
    console.log(`   ✅ Court ID: ${assignedCourtId}`);
    
    // 9. Actualizar TimeSlot
    const result = await prisma.$executeRaw`
      UPDATE TimeSlot 
      SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
      WHERE id = ${timeSlotId}
    `;
    
    console.log(`   ✅ TimeSlot actualizado (${result} row)`);
    
    // 10. Confirmar reservas ganadoras
    console.log('\n💳 Confirmando reservas ganadoras...');
    const winningBookings = allBookingsForSlot.filter(b => b.groupSize === raceWinner);
    
    for (const booking of winningBookings) {
      const bookingInfo = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { amountBlocked: true, userId: true }
      });
      
      const amountToCharge = bookingInfo?.amountBlocked || 0;
      
      // Cobrar
      await prisma.$executeRaw`
        UPDATE User 
        SET credits = credits - ${amountToCharge}, updatedAt = datetime('now')
        WHERE id = ${booking.userId}
      `;
      
      // Confirmar
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CONFIRMED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      console.log(`   ✅ Reserva ${booking.id} confirmada y cobrada (€${amountToCharge/100})`);
    }
    
    console.log('\n✅ PROCESO COMPLETADO');
  } else {
    console.log('   ❌ No se pudo obtener Court ID');
  }
  
  await prisma.$disconnect();
}

simulateRaceSystem().catch(console.error);

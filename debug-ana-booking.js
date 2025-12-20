const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAnaBooking() {
  console.log('\n🔍 DEBUG: Buscando reserva de Ana Nueva\n');
  console.log('='.repeat(70));
  
  // Buscar usuario Ana
  const anaUsers = await prisma.$queryRaw`
    SELECT id, name, email
    FROM User
    WHERE name LIKE '%Ana%'
  `;
  
  console.log('\n👤 Usuarios con "Ana" en el nombre:');
  anaUsers.forEach(u => {
    console.log(`   - ${u.name} (${u.email}) - ID: ${u.id}`);
  });
  
  if (anaUsers.length === 0) {
    console.log('\n⚠️ No se encontró usuario Ana');
    await prisma.$disconnect();
    return;
  }
  
  const ana = anaUsers[0];
  
  // Buscar bookings de Ana
  const anaBookings = await prisma.$queryRaw`
    SELECT 
      b.id,
      b.timeSlotId,
      b.status,
      b.isRecycled,
      b.groupSize,
      b.amountBlocked,
      ts.start,
      ts.instructorId,
      ts.hasRecycledSlots,
      i.name as instructorName,
      u.name as userName
    FROM Booking b
    LEFT JOIN TimeSlot ts ON b.timeSlotId = ts.id
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE b.userId = ${ana.id}
    AND ts.start >= ${Date.now()}
    ORDER BY ts.start ASC
    LIMIT 10
  `;
  
  console.log(`\n📋 Bookings de ${ana.name}:`);
  console.log(`   Total: ${anaBookings.length}`);
  
  if (anaBookings.length === 0) {
    console.log('\n⚠️ No hay bookings futuros para Ana');
    await prisma.$disconnect();
    return;
  }
  
  anaBookings.forEach((b, idx) => {
    console.log(`\n${idx + 1}. Booking ${b.id.substring(0, 20)}...`);
    console.log(`   📅 Fecha: ${new Date(Number(b.start)).toLocaleString('es-ES')}`);
    console.log(`   👨‍🏫 Instructor: ${b.userName || b.instructorName || 'N/A'}`);
    console.log(`   📊 Status: ${b.status}`);
    console.log(`   ♻️ isRecycled: ${b.isRecycled === 1 ? 'SÍ' : 'NO'}`);
    console.log(`   👥 groupSize: ${b.groupSize}`);
    console.log(`   💰 amountBlocked: €${b.amountBlocked}`);
    console.log(`   🎾 TimeSlot hasRecycledSlots: ${b.hasRecycledSlots === 1 ? 'SÍ' : 'NO'}`);
  });
  
  // Buscar la clase específica del 9 de diciembre a las 9:00
  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 Buscando clase del 9 dic a las 9:00h...\n');
  
  const dec9Morning = new Date('2025-12-09T09:00:00.000Z').getTime();
  const dec9MorningEnd = new Date('2025-12-09T10:00:00.000Z').getTime();
  
  const dec9Slots = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.maxPlayers,
      ts.hasRecycledSlots,
      ts.courtNumber,
      i.name as instructorName,
      u.name as userName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE ts.start >= ${dec9Morning}
    AND ts.start < ${dec9MorningEnd}
  `;
  
  console.log(`📊 Clases encontradas: ${dec9Slots.length}\n`);
  
  for (const slot of dec9Slots) {
    console.log(`🎾 Clase: ${slot.userName || slot.instructorName || 'N/A'}`);
    console.log(`   ID: ${slot.id.substring(0, 20)}...`);
    console.log(`   👥 maxPlayers: ${slot.maxPlayers}`);
    console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
    console.log(`   ♻️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ' : 'NO'}`);
    
    // Buscar bookings de esta clase
    const slotBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.status,
        b.isRecycled,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${slot.id}
    `;
    
    console.log(`   📋 Bookings (${slotBookings.length}):`);
    slotBookings.forEach(b => {
      console.log(`      - ${b.userName}: ${b.status}${b.isRecycled === 1 ? ' ♻️' : ''} (groupSize: ${b.groupSize})`);
    });
    console.log('');
  }
  
  await prisma.$disconnect();
}

debugAnaBooking().catch(console.error);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentCancellations() {
  console.log('\n🔍 BUSCANDO CANCELACIONES RECIENTES\n');
  console.log('='.repeat(80));
  
  // Buscar bookings cancelados en las últimas 24 horas
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  const cancelledBookings = await prisma.$queryRaw`
    SELECT 
      b.id,
      b.userId,
      b.status,
      b.isRecycled,
      b.groupSize,
      b.amountBlocked,
      b.paidWithPoints,
      b.createdAt,
      b.updatedAt,
      b.timeSlotId,
      u.name as userName,
      u.email as userEmail,
      ts.start as slotStart,
      ts.hasRecycledSlots,
      ts.courtNumber,
      ts.maxPlayers,
      i.name as instructorName,
      iu.name as instructorUserName
    FROM Booking b
    LEFT JOIN User u ON b.userId = u.id
    LEFT JOIN TimeSlot ts ON b.timeSlotId = ts.id
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User iu ON i.userId = iu.id
    WHERE b.status = 'CANCELLED'
    AND b.updatedAt >= ${oneDayAgo}
    ORDER BY b.updatedAt DESC
    LIMIT 20
  `;
  
  console.log(`\n📋 Cancelaciones encontradas (últimas 24h): ${cancelledBookings.length}\n`);
  
  if (cancelledBookings.length === 0) {
    console.log('⚠️ No hay cancelaciones recientes');
    await prisma.$disconnect();
    return;
  }
  
  for (const b of cancelledBookings) {
    console.log('='.repeat(80));
    console.log(`\n❌ Booking ${b.id.substring(0, 30)}...`);
    console.log(`👤 Usuario: ${b.userName} (${b.userEmail})`);
    console.log(`📅 Clase: ${new Date(Number(b.slotStart)).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
    console.log(`👨‍🏫 Instructor: ${b.instructorUserName || b.instructorName || 'N/A'}`);
    console.log(`👥 groupSize: ${b.groupSize}`);
    console.log(`💰 Bloqueado: €${b.amountBlocked}`);
    console.log(`🕐 Creado: ${new Date(Number(b.createdAt)).toLocaleString('es-ES')}`);
    console.log(`🕐 Cancelado: ${new Date(Number(b.updatedAt)).toLocaleString('es-ES')}`);
    console.log(`♻️ isRecycled en Booking: ${b.isRecycled === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`♻️ hasRecycledSlots en TimeSlot: ${b.hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`🎾 Pista asignada: ${b.courtNumber || 'Sin asignar'}`);
    console.log(`👥 Max jugadores: ${b.maxPlayers}`);
    
    // Verificar bookings activos en esa clase
    const activeBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${b.timeSlotId}
      AND b.status != 'CANCELLED'
    `;
    
    console.log(`\n📊 Bookings activos en esa clase: ${activeBookings.length}`);
    if (activeBookings.length > 0) {
      activeBookings.forEach(ab => {
        console.log(`   - ${ab.userName}: ${ab.groupSize} jugadores`);
      });
    }
    
    const totalOccupied = activeBookings.reduce((sum, ab) => sum + ab.groupSize, 0);
    const available = b.maxPlayers - totalOccupied;
    console.log(`\n📊 Plazas ocupadas: ${totalOccupied}/${b.maxPlayers}`);
    console.log(`📊 Plazas disponibles: ${available}`);
    
    if (b.isRecycled === 0) {
      console.log('\n⚠️ PROBLEMA: Booking cancelado pero NO marcado como reciclado');
    }
    if (b.hasRecycledSlots === 0 && b.isRecycled === 1) {
      console.log('\n⚠️ PROBLEMA: Booking marcado como reciclado pero TimeSlot NO tiene hasRecycledSlots=true');
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkRecentCancellations().catch(console.error);

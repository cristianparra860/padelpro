const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDec9Class() {
  console.log('\n🔍 BUSCANDO CLASE DEL 9 DICIEMBRE 09:00h\n');
  console.log('='.repeat(80));
  
  // Buscar la clase específica
  const dec9Start = new Date('2025-12-09T08:00:00.000Z').getTime(); // 09:00 CET = 08:00 UTC
  const dec9End = new Date('2025-12-09T10:00:00.000Z').getTime();
  
  const timeSlots = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.maxPlayers,
      ts.hasRecycledSlots,
      ts.courtNumber,
      ts.level,
      ts.genderCategory,
      i.name as instructorName,
      u.name as instructorUserName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE ts.start >= ${dec9Start}
    AND ts.start < ${dec9End}
    ORDER BY ts.start
  `;
  
  console.log(`\n📊 Clases encontradas en ese horario: ${timeSlots.length}\n`);
  
  if (timeSlots.length === 0) {
    console.log('⚠️ No hay clases en ese horario');
    await prisma.$disconnect();
    return;
  }
  
  for (const slot of timeSlots) {
    console.log('='.repeat(80));
    console.log(`\n🎾 TimeSlot ID: ${slot.id}`);
    console.log(`📅 Hora: ${new Date(Number(slot.start)).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
    console.log(`👨‍🏫 Instructor: ${slot.instructorUserName || slot.instructorName || 'N/A'}`);
    console.log(`👥 Max jugadores: ${slot.maxPlayers}`);
    console.log(`🎾 Pista asignada: ${slot.courtNumber || 'Sin asignar'}`);
    console.log(`📊 Nivel: ${slot.level || 'N/A'}`);
    console.log(`⚧ Categoría: ${slot.genderCategory || 'N/A'}`);
    console.log(`♻️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    
    // Buscar todos los bookings de esta clase
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.status,
        b.isRecycled,
        b.groupSize,
        b.amountBlocked,
        b.paidWithPoints,
        b.createdAt,
        u.name as userName,
        u.email as userEmail
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${slot.id}
      ORDER BY b.createdAt
    `;
    
    console.log(`\n📋 BOOKINGS (${bookings.length}):\n`);
    
    if (bookings.length === 0) {
      console.log('   ⚠️ No hay bookings en esta clase');
    } else {
      bookings.forEach((b, idx) => {
        console.log(`${idx + 1}. Booking ${b.id.substring(0, 25)}...`);
        console.log(`   👤 Usuario: ${b.userName} (${b.userEmail})`);
        console.log(`   📊 Status: ${b.status} ${b.status === 'CANCELLED' ? '❌' : '✅'}`);
        console.log(`   ♻️ isRecycled: ${b.isRecycled === 1 ? 'SÍ ♻️' : 'NO'}`);
        console.log(`   👥 groupSize: ${b.groupSize}`);
        console.log(`   💰 Bloqueado: €${b.amountBlocked}`);
        console.log(`   🎁 Pagado con puntos: ${b.paidWithPoints === 1 ? 'SÍ' : 'NO'}`);
        console.log(`   🕐 Creado: ${new Date(Number(b.createdAt)).toLocaleString('es-ES')}`);
        console.log('');
      });
      
      // Resumen
      const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
      const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');
      const recycledBookings = bookings.filter(b => b.isRecycled === 1);
      
      console.log('📈 RESUMEN:');
      console.log(`   Total bookings: ${bookings.length}`);
      console.log(`   Activos: ${activeBookings.length} ✅`);
      console.log(`   Cancelados: ${cancelledBookings.length} ❌`);
      console.log(`   Reciclados: ${recycledBookings.length} ♻️`);
      console.log(`   Plazas ocupadas: ${activeBookings.reduce((sum, b) => sum + b.groupSize, 0)}/${slot.maxPlayers}`);
      
      const availableSlots = slot.maxPlayers - activeBookings.reduce((sum, b) => sum + b.groupSize, 0);
      console.log(`   Plazas disponibles: ${availableSlots}`);
      
      if (cancelledBookings.length > 0 && slot.hasRecycledSlots === 0) {
        console.log('\n⚠️ PROBLEMA DETECTADO:');
        console.log(`   Hay ${cancelledBookings.length} booking(s) cancelado(s)`);
        console.log(`   Pero hasRecycledSlots = false en el TimeSlot`);
        console.log('   👉 El TimeSlot debería tener hasRecycledSlots = true');
      }
      
      if (cancelledBookings.length > 0 && slot.hasRecycledSlots === 1) {
        console.log('\n✅ ESTADO CORRECTO:');
        console.log('   hasRecycledSlots está marcado correctamente');
      }
    }
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkDec9Class().catch(console.error);

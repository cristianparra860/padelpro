const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCarlosClass() {
  console.log('\n🔍 BUSCANDO CLASE DE CARLOS MARTINEZ 9:00h DEL 9 DIC CON PISTA 1\n');
  console.log('='.repeat(80));
  
  const dec9Start = new Date('2025-12-09T08:00:00.000Z').getTime(); // 09:00 CET = 08:00 UTC
  const dec9End = new Date('2025-12-09T09:00:00.000Z').getTime();
  
  const carlosSlots = await prisma.$queryRaw`
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
    AND ts.courtNumber = 1
    AND (u.name LIKE '%Carlos%' OR i.name LIKE '%Carlos%')
  `;
  
  console.log(`📊 Clases de Carlos en pista 1 a las 9:00: ${carlosSlots.length}\n`);
  
  if (carlosSlots.length === 0) {
    console.log('⚠️ No se encontró la clase');
    await prisma.$disconnect();
    return;
  }
  
  for (const slot of carlosSlots) {
    console.log('='.repeat(80));
    console.log(`\n🎾 TimeSlot ID: ${slot.id}`);
    console.log(`📅 Hora: ${new Date(Number(slot.start)).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
    console.log(`👨‍🏫 Instructor: ${slot.instructorUserName || slot.instructorName}`);
    console.log(`👥 Max jugadores: ${slot.maxPlayers}`);
    console.log(`🎾 Pista: ${slot.courtNumber}`);
    console.log(`📊 Nivel: ${slot.level}`);
    console.log(`⚧ Categoría: ${slot.genderCategory}`);
    console.log(`♻️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    
    // Buscar TODOS los bookings (incluso cancelados)
    const allBookings = await prisma.$queryRaw`
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
        u.name as userName,
        u.email as userEmail
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${slot.id}
      ORDER BY b.createdAt
    `;
    
    console.log(`\n📋 TODOS LOS BOOKINGS (${allBookings.length}):\n`);
    
    allBookings.forEach((b, idx) => {
      console.log(`${idx + 1}. ${b.status} - ${b.userName}`);
      console.log(`   Booking ID: ${b.id.substring(0, 25)}...`);
      console.log(`   Email: ${b.userEmail}`);
      console.log(`   Status: ${b.status} ${b.status === 'CANCELLED' ? '❌' : '✅'}`);
      console.log(`   ♻️ isRecycled: ${b.isRecycled === 1 ? 'SÍ ♻️' : 'NO'}`);
      console.log(`   👥 groupSize: ${b.groupSize}`);
      console.log(`   💰 Bloqueado: €${b.amountBlocked}`);
      console.log(`   🎁 Con puntos: ${b.paidWithPoints === 1 ? 'SÍ' : 'NO'}`);
      console.log(`   🕐 Creado: ${new Date(Number(b.createdAt)).toLocaleString('es-ES')}`);
      console.log(`   🕐 Actualizado: ${new Date(Number(b.updatedAt)).toLocaleString('es-ES')}`);
      console.log('');
    });
    
    // Resumen
    const activeBookings = allBookings.filter(b => b.status !== 'CANCELLED');
    const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');
    const recycledBookings = allBookings.filter(b => b.isRecycled === 1);
    
    console.log('📈 RESUMEN:');
    console.log(`   Total bookings: ${allBookings.length}`);
    console.log(`   Activos: ${activeBookings.length}`);
    console.log(`   Cancelados: ${cancelledBookings.length}`);
    console.log(`   Marcados como reciclados: ${recycledBookings.length}`);
    
    const occupiedSlots = activeBookings.reduce((sum, b) => sum + b.groupSize, 0);
    console.log(`   Plazas ocupadas: ${occupiedSlots}/${slot.maxPlayers}`);
    console.log(`   Plazas disponibles: ${slot.maxPlayers - occupiedSlots}`);
    
    if (cancelledBookings.length > 0 && slot.hasRecycledSlots === 0) {
      console.log('\n⚠️ ⚠️ PROBLEMA DETECTADO ⚠️ ⚠️');
      console.log(`   Hay ${cancelledBookings.length} booking(s) cancelado(s)`);
      console.log('   Pero hasRecycledSlots = false en el TimeSlot');
      console.log('   👉 La clase debería mostrar plazas recicladas');
      
      // Verificar si eran confirmados
      cancelledBookings.forEach(cb => {
        console.log(`   - ${cb.userName}: isRecycled=${cb.isRecycled === 1 ? 'SÍ' : 'NO'}`);
      });
    }
  }
  
  await prisma.$disconnect();
}

findCarlosClass().catch(console.error);

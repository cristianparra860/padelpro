const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosClassHistory() {
  console.log('\n🔍 BUSCANDO HISTORIAL COMPLETO DE CLASE CARLOS MARTINEZ 9:00 DIA 9\n');
  console.log('='.repeat(80));
  
  const timeSlotId = 'ts-1764308197680-dpjdjcrk1ah';
  
  // Buscar TODOS los bookings de esta clase (sin límite de fecha)
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
    WHERE b.timeSlotId = ${timeSlotId}
    ORDER BY b.createdAt
  `;
  
  console.log(`📋 BOOKINGS TOTALES EN ESTA CLASE: ${allBookings.length}\n`);
  
  allBookings.forEach((b, idx) => {
    console.log('='.repeat(80));
    console.log(`\n${idx + 1}. ${b.status} - ${b.userName}`);
    console.log(`   Booking ID: ${b.id}`);
    console.log(`   Email: ${b.userEmail}`);
    console.log(`   📊 Status: ${b.status} ${b.status === 'CANCELLED' ? '❌' : '✅'}`);
    console.log(`   ♻️ isRecycled: ${b.isRecycled === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`   👥 groupSize: ${b.groupSize}`);
    console.log(`   💰 Bloqueado: €${b.amountBlocked}`);
    console.log(`   🎁 Con puntos: ${b.paidWithPoints === 1 ? 'SÍ' : 'NO'}`);
    console.log(`   🕐 Creado: ${new Date(Number(b.createdAt)).toLocaleString('es-ES')}`);
    console.log(`   🕐 Actualizado: ${new Date(Number(b.updatedAt)).toLocaleString('es-ES')}`);
    console.log('');
  });
  
  // Verificar TimeSlot
  const timeSlot = await prisma.$queryRaw`
    SELECT 
      id,
      hasRecycledSlots,
      courtNumber,
      maxPlayers,
      start
    FROM TimeSlot
    WHERE id = ${timeSlotId}
  `;
  
  console.log('='.repeat(80));
  console.log('\n🎾 ESTADO DEL TIMESLOT:\n');
  console.log(`   ID: ${timeSlot[0].id}`);
  console.log(`   📅 Fecha: ${new Date(Number(timeSlot[0].start)).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
  console.log(`   🎾 Pista: ${timeSlot[0].courtNumber || 'Sin asignar'}`);
  console.log(`   👥 Max jugadores: ${timeSlot[0].maxPlayers}`);
  console.log(`   ♻️ hasRecycledSlots: ${timeSlot[0].hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
  
  // Análisis
  const activeBookings = allBookings.filter(b => b.status !== 'CANCELLED');
  const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');
  const confirmedBookings = allBookings.filter(b => b.status === 'CONFIRMED');
  
  console.log('\n📊 ANÁLISIS:');
  console.log(`   Total bookings: ${allBookings.length}`);
  console.log(`   Activos: ${activeBookings.length}`);
  console.log(`   Confirmados: ${confirmedBookings.length}`);
  console.log(`   Cancelados: ${cancelledBookings.length}`);
  
  if (cancelledBookings.length > 0) {
    console.log('\n❌ BOOKINGS CANCELADOS:');
    cancelledBookings.forEach(cb => {
      console.log(`   - ${cb.userName} (${cb.email})`);
      console.log(`     groupSize: ${cb.groupSize}`);
      console.log(`     isRecycled: ${cb.isRecycled === 1 ? 'SÍ ✅' : 'NO ❌'}`);
      console.log(`     Cancelado: ${new Date(Number(cb.updatedAt)).toLocaleString('es-ES')}`);
    });
  }
  
  const occupiedSlots = activeBookings.reduce((sum, b) => sum + b.groupSize, 0);
  console.log(`\n   Plazas ocupadas: ${occupiedSlots}/${timeSlot[0].maxPlayers}`);
  console.log(`   Plazas disponibles: ${timeSlot[0].maxPlayers - occupiedSlots}`);
  
  if (cancelledBookings.length > 0 && confirmedBookings.length > 0) {
    console.log('\n⚠️ DIAGNÓSTICO:');
    console.log(`   ✅ Hay ${confirmedBookings.length} booking(s) confirmado(s)`);
    console.log(`   ❌ Hay ${cancelledBookings.length} booking(s) cancelado(s)`);
    
    if (timeSlot[0].hasRecycledSlots === 0) {
      console.log('   🔴 PROBLEMA: hasRecycledSlots = false');
      console.log('   👉 Debería ser true para mostrar plazas recicladas');
    } else {
      console.log('   ✅ hasRecycledSlots = true (correcto)');
    }
    
    const recycledBookings = cancelledBookings.filter(b => b.isRecycled === 1);
    if (recycledBookings.length === 0) {
      console.log('   🔴 PROBLEMA: Ningún booking cancelado está marcado con isRecycled=true');
    } else {
      console.log(`   ✅ ${recycledBookings.length} booking(s) marcado(s) como reciclado(s)`);
    }
  }
  
  await prisma.$disconnect();
}

checkCarlosClassHistory().catch(console.error);

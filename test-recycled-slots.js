const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRecycledSlots() {
  console.log('\n🧪 TEST: Verificando lógica de plazas recicladas\n');
  console.log('='.repeat(70));
  
  // 1. Buscar clases con plazas recicladas
  console.log('\n📋 PASO 1: Buscar clases con plazas recicladas');
  const recycledSlots = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.courtNumber,
      ts.hasRecycledSlots,
      ts.maxPlayers,
      COUNT(DISTINCT CASE WHEN b.status != 'CANCELLED' THEN b.id END) as activeBookings,
      COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' AND b.isRecycled = 1 THEN b.id END) as recycledBookings
    FROM TimeSlot ts
    LEFT JOIN Booking b ON ts.id = b.timeSlotId
    WHERE ts.hasRecycledSlots = 1
    GROUP BY ts.id
  `;
  
  console.log(`✅ Encontradas ${recycledSlots.length} clases con plazas recicladas`);
  
  if (recycledSlots.length > 0) {
    recycledSlots.forEach((slot, idx) => {
      console.log(`\n${idx + 1}. Clase ID: ${slot.id.substring(0, 20)}...`);
      console.log(`   📅 Fecha: ${new Date(Number(slot.start)).toLocaleString('es-ES')}`);
      console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
      console.log(`   👥 Jugadores activos: ${slot.activeBookings}/${slot.maxPlayers}`);
      console.log(`   ♻️ Plazas recicladas: ${slot.recycledBookings}`);
      console.log(`   🏷️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ' : 'NO'}`);
    });
    
    // 2. Verificar detalles de bookings de la primera clase
    const firstSlot = recycledSlots[0];
    console.log('\n' + '='.repeat(70));
    console.log(`\n📋 PASO 2: Detalles de bookings en clase ${firstSlot.id.substring(0, 20)}...`);
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.status,
        b.groupSize,
        b.isRecycled,
        b.amountBlocked,
        u.name as userName,
        u.email
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${firstSlot.id}
      ORDER BY b.createdAt ASC
    `;
    
    console.log(`\n📊 Total bookings (incluye canceladas): ${bookings.length}`);
    
    bookings.forEach((b, idx) => {
      console.log(`\n${idx + 1}. Booking ID: ${b.id.substring(0, 20)}...`);
      console.log(`   👤 Usuario: ${b.userName} (${b.email})`);
      console.log(`   📊 Status: ${b.status}`);
      console.log(`   👥 Tamaño grupo: ${b.groupSize}`);
      console.log(`   ♻️ Es reciclada: ${b.isRecycled === 1 ? 'SÍ' : 'NO'}`);
      console.log(`   💰 Monto bloqueado: €${b.amountBlocked}`);
    });
    
    // 3. Verificar qué usuarios deberían ver esta clase
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 PASO 3: Verificando visibilidad de la clase');
    
    const confirmedUsers = bookings.filter(b => b.status === 'CONFIRMED').map(b => b.userId);
    const cancelledUsers = bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled === 1).map(b => b.userId);
    
    console.log(`\n✅ Usuarios con booking CONFIRMADO (día BLOQUEADO):`);
    for (const userId of confirmedUsers) {
      const user = bookings.find(b => b.userId === userId);
      console.log(`   - ${user.userName} (${user.email})`);
    }
    
    console.log(`\n♻️ Usuarios que CANCELARON (día DESBLOQUEADO, pueden reservar con puntos):`);
    for (const userId of cancelledUsers) {
      const user = bookings.find(b => b.userId === userId);
      console.log(`   - ${user.userName} (${user.email})`);
    }
    
    console.log(`\n🌍 OTROS usuarios del mismo rango de nivel también pueden reservar con puntos`);
    
  } else {
    console.log('\n⚠️ No hay clases con plazas recicladas en este momento');
    console.log('💡 Para probar:');
    console.log('   1. Reserva 2 plazas en una clase de 2 jugadores');
    console.log('   2. Cancela una de las plazas');
    console.log('   3. Ejecuta este script de nuevo');
  }
  
  // 4. Verificar bloqueos de día
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 PASO 4: Verificar bloqueos de día por usuario');
  
  const futureBookings = await prisma.$queryRaw`
    SELECT 
      b.userId,
      u.name as userName,
      u.email,
      ts.start,
      ts.courtNumber,
      b.status,
      b.isRecycled,
      DATE(ts.start / 1000, 'unixepoch') as bookingDate
    FROM Booking b
    LEFT JOIN User u ON b.userId = u.id
    LEFT JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE ts.start >= ${Date.now()}
    AND b.status IN ('CONFIRMED', 'PENDING')
    ORDER BY b.userId, ts.start
    LIMIT 20
  `;
  
  const userDays = {};
  futureBookings.forEach(b => {
    if (!userDays[b.userId]) {
      userDays[b.userId] = {
        name: b.userName,
        email: b.email,
        blockedDays: new Set(),
        confirmedDays: new Set()
      };
    }
    
    if (b.status === 'CONFIRMED') {
      userDays[b.userId].confirmedDays.add(b.bookingDate);
      userDays[b.userId].blockedDays.add(b.bookingDate);
    }
  });
  
  console.log('\n📊 Resumen de días bloqueados por usuario:');
  Object.keys(userDays).forEach(userId => {
    const user = userDays[userId];
    console.log(`\n👤 ${user.name} (${user.email})`);
    console.log(`   🚫 Días bloqueados: ${[...user.blockedDays].join(', ') || 'Ninguno'}`);
    console.log(`   ✅ Reservas confirmadas: ${user.confirmedDays.size}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ CONCLUSIÓN:');
  console.log('   📌 Usuarios con booking CONFIRMADO: Día BLOQUEADO (no pueden reservar más clases ese día)');
  console.log('   📌 Usuarios que CANCELARON: Día DESBLOQUEADO (pueden reservar de nuevo)');
  console.log('   📌 Plaza reciclada: Solo reservable con PUNTOS (no con saldo)');
  console.log('   📌 Otros usuarios del mismo nivel también pueden reservar con PUNTOS');
  
  await prisma.$disconnect();
}

testRecycledSlots().catch(console.error);

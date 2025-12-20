const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRecycledFlow() {
  console.log('🧪 TEST COMPLETO DE RECICLAJE DE PLAZAS\n');
  console.log('═══════════════════════════════════════\n');
  
  // 1. Buscar una clase futura con pista asignada
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  console.log('📅 1. Buscando clases futuras con pista asignada...\n');
  
  const confirmedSlots = await prisma.timeSlot.findMany({
    where: {
      start: { gte: tomorrow },
      courtNumber: { not: null }
    },
    include: {
      bookings: {
        where: { status: 'CONFIRMED' }
      }
    },
    take: 5
  });
  
  if (confirmedSlots.length === 0) {
    console.log('❌ No hay clases confirmadas futuras para probar\n');
    await prisma.$disconnect();
    return;
  }
  
  const testSlot = confirmedSlots[0];
  const date = new Date(testSlot.start);
  console.log(`✅ Clase encontrada: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
  console.log(`   Pista: ${testSlot.courtNumber}`);
  console.log(`   Bookings confirmados actuales: ${testSlot.bookings.length}\n`);
  
  // 2. Crear un booking de prueba
  console.log('📝 2. Creando booking de prueba...\n');
  
  const testBooking = await prisma.booking.create({
    data: {
      id: `test-recycled-${Date.now()}`,
      userId: 'user-1763677035576-wv1t7iun0', // Marc Parra
      timeSlotId: testSlot.id,
      groupSize: 1,
      status: 'CONFIRMED',
      isRecycled: false,
      pointsUsed: 0,
      amountBlocked: 0
    }
  });
  
  console.log(`✅ Booking creado: ${testBooking.id}\n`);
  
  // 3. Verificar estado ANTES de cancelar
  console.log('📊 3. Estado ANTES de cancelar:\n');
  
  const slotBefore = await prisma.timeSlot.findUnique({
    where: { id: testSlot.id },
    include: {
      bookings: {
        where: { status: { in: ['CONFIRMED', 'CANCELLED'] } }
      }
    }
  });
  
  console.log(`   hasRecycledSlots: ${slotBefore.hasRecycledSlots}`);
  console.log(`   availableRecycledSlots: ${slotBefore.availableRecycledSlots}`);
  console.log(`   recycledSlotsOnlyPoints: ${slotBefore.recycledSlotsOnlyPoints}`);
  console.log(`   Total bookings: ${slotBefore.bookings.length}`);
  console.log(`   Confirmed: ${slotBefore.bookings.filter(b => b.status === 'CONFIRMED').length}`);
  console.log(`   Cancelled: ${slotBefore.bookings.filter(b => b.status === 'CANCELLED').length}\n`);
  
  // 4. CANCELAR el booking (esto debería activar el reciclaje)
  console.log('❌ 4. Cancelando booking...\n');
  
  const cancelledBooking = await prisma.booking.update({
    where: { id: testBooking.id },
    data: {
      status: 'CANCELLED',
      isRecycled: true
    }
  });
  
  console.log(`✅ Booking cancelado y marcado como reciclado\n`);
  
  // 5. Actualizar el TimeSlot manualmente (simular markSlotAsRecycled)
  console.log('🔄 5. Actualizando TimeSlot con datos de reciclaje...\n');
  
  const activeBookings = await prisma.booking.count({
    where: {
      timeSlotId: testSlot.id,
      status: 'CONFIRMED'
    }
  });
  
  const availableRecycled = testSlot.maxPlayers - activeBookings;
  
  await prisma.timeSlot.update({
    where: { id: testSlot.id },
    data: {
      hasRecycledSlots: true,
      availableRecycledSlots: availableRecycled,
      recycledSlotsOnlyPoints: true
    }
  });
  
  console.log(`✅ TimeSlot actualizado:`);
  console.log(`   availableRecycledSlots: ${availableRecycled}`);
  console.log(`   hasRecycledSlots: true`);
  console.log(`   recycledSlotsOnlyPoints: true\n`);
  
  // 6. Verificar estado DESPUÉS de cancelar
  console.log('📊 6. Estado DESPUÉS de cancelar:\n');
  
  const slotAfter = await prisma.timeSlot.findUnique({
    where: { id: testSlot.id },
    include: {
      bookings: {
        where: { status: { in: ['CONFIRMED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  console.log(`   hasRecycledSlots: ${slotAfter.hasRecycledSlots}`);
  console.log(`   availableRecycledSlots: ${slotAfter.availableRecycledSlots}`);
  console.log(`   recycledSlotsOnlyPoints: ${slotAfter.recycledSlotsOnlyPoints}`);
  console.log(`   Total bookings: ${slotAfter.bookings.length}`);
  console.log(`   Confirmed: ${slotAfter.bookings.filter(b => b.status === 'CONFIRMED').length}`);
  console.log(`   Cancelled+Recycled: ${slotAfter.bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled).length}\n`);
  
  console.log('📋 Bookings en esta clase:\n');
  slotAfter.bookings.forEach(b => {
    console.log(`   ${b.status} | isRecycled: ${b.isRecycled} | ID: ${b.id.substring(0, 30)}...`);
  });
  
  // 7. Verificar cómo se vería en la API
  console.log('\n🌐 7. Simulación de respuesta API:\n');
  
  const apiResponse = {
    id: slotAfter.id,
    start: slotAfter.start,
    courtNumber: slotAfter.courtNumber,
    maxPlayers: slotAfter.maxPlayers,
    hasRecycledSlots: slotAfter.hasRecycledSlots,
    availableRecycledSlots: slotAfter.availableRecycledSlots,
    recycledSlotsOnlyPoints: slotAfter.recycledSlotsOnlyPoints,
    bookings: slotAfter.bookings.map(b => ({
      id: b.id,
      status: b.status,
      isRecycled: b.isRecycled,
      groupSize: b.groupSize
    }))
  };
  
  console.log(JSON.stringify(apiResponse, null, 2));
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ TEST COMPLETADO\n');
  console.log('🔍 Verificaciones necesarias:\n');
  console.log('   1. hasRecycledSlots debe ser TRUE');
  console.log('   2. availableRecycledSlots debe ser > 0');
  console.log('   3. Debe haber al menos 1 booking CANCELLED con isRecycled=true');
  console.log('   4. El badge amarillo debería aparecer en el frontend\n');
  
  await prisma.$disconnect();
}

testRecycledFlow().catch(console.error);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAPI() {
  console.log('\n🔍 VERIFICACIÓN COMPLETA: API vs DATABASE\n');
  console.log('=' .repeat(60));
  
  // 1. Check database directly
  console.log('\n📊 PASO 1: Estado en la BASE DE DATOS');
  console.log('-'.repeat(60));
  
  const slots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, 
           i.name as instructorName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    WHERE i.name = 'María Fernández'
      AND ts.start >= ${new Date('2025-12-15T00:00:00').getTime()}
      AND ts.start < ${new Date('2025-12-15T23:59:59').getTime()}
      AND ts.courtId IS NOT NULL
    LIMIT 1
  `);
  
  const timeSlot = slots[0];
  
  if (timeSlot) {
    // Fetch bookings separately
    const bookings = await prisma.booking.findMany({
      where: { timeSlotId: timeSlot.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    timeSlot.bookings = bookings;
  }
  
  if (!timeSlot) {
    console.log('❌ No se encontró la clase de María Fernández');
    process.exit(1);
  }
  
  console.log(`✅ Clase encontrada: ${timeSlot.instructorName}`);
  console.log(`   Hora: ${new Date(Number(timeSlot.start)).toLocaleString()}`);
  console.log(`   Pista: ${timeSlot.courtNumber}`);
  console.log(`   Court ID: ${timeSlot.courtId}`);
  
  console.log(`\n   Total bookings: ${timeSlot.bookings.length}`);
  
  const activeBookings = timeSlot.bookings.filter(b => 
    b.status === 'PENDING' || b.status === 'CONFIRMED'
  );
  
  const recycledBookings = timeSlot.bookings.filter(b => 
    b.status === 'CANCELLED' && b.isRecycled
  );
  
  console.log(`   Bookings activos: ${activeBookings.length}`);
  console.log(`   Bookings reciclados: ${recycledBookings.length}`);
  
  if (recycledBookings.length > 0) {
    console.log('\n   📋 Detalles de bookings reciclados:');
    recycledBookings.forEach(b => {
      console.log(`      - ${b.user.name}: ${b.groupSize}p, €${b.amountBlocked}`);
      console.log(`        Status: ${b.status}, isRecycled: ${b.isRecycled}`);
    });
  }
  
  // Calculate expected values
  const availableRecycledSlots = recycledBookings.reduce(
    (sum, b) => sum + (Number(b.groupSize) || 1), 
    0
  );
  
  const hasRecycledSlots = availableRecycledSlots > 0;
  
  console.log(`\n   🎯 Valores calculados:`);
  console.log(`      hasRecycledSlots: ${hasRecycledSlots}`);
  console.log(`      availableRecycledSlots: ${availableRecycledSlots}`);
  console.log(`      recycledSlotsOnlyPoints: ${hasRecycledSlots}`);
  
  // 2. Now check what the API would return
  console.log('\n📡 PASO 2: Simulando cálculo de la API /timeslots');
  console.log('-'.repeat(60));
  
  // Simulate the API calculation (from route.ts lines 260-285)
  const slotBookings = timeSlot.bookings;
  const maxPlayers = Number(timeSlot.maxPlayers) || 4;
  
  const apiRecycledBookings = slotBookings.filter(b => 
    b.status === 'CANCELLED' && b.isRecycled
  );
  
  const apiAvailableRecycledSlots = apiRecycledBookings.reduce(
    (sum, b) => sum + (Number(b.groupSize) || 1), 
    0
  );
  
  const apiHasRecycledSlots = apiAvailableRecycledSlots > 0;
  const apiRecycledSlotsOnlyPoints = apiHasRecycledSlots;
  
  console.log(`   API debería devolver:`);
  console.log(`      hasRecycledSlots: ${apiHasRecycledSlots}`);
  console.log(`      availableRecycledSlots: ${apiAvailableRecycledSlots}`);
  console.log(`      recycledSlotsOnlyPoints: ${apiRecycledSlotsOnlyPoints}`);
  
  // 3. Check frontend logic
  console.log('\n🎨 PASO 3: Lógica del FRONTEND (ClassCardReal)');
  console.log('-'.repeat(60));
  
  const hasCourtNumber = timeSlot.courtNumber !== null;
  const shouldShowBadge = hasCourtNumber && apiHasRecycledSlots && apiAvailableRecycledSlots > 0;
  
  console.log(`   hasCourtNumber: ${hasCourtNumber} (${timeSlot.courtNumber})`);
  console.log(`   hasRecycledSlots: ${apiHasRecycledSlots}`);
  console.log(`   availableRecycledSlots: ${apiAvailableRecycledSlots}`);
  console.log(`   shouldShowBadge: ${shouldShowBadge}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (shouldShowBadge) {
    console.log('\n✅ RESULTADO: Badge 🎁 DEBE MOSTRARSE');
    console.log(`   Badge text: "${apiAvailableRecycledSlots}p"`);
    console.log(`   Tooltip: "Plazas recicladas: ${apiAvailableRecycledSlots}"`);
  } else {
    console.log('\n❌ PROBLEMA: Badge NO se mostrará');
    console.log('\n   Verificar:');
    if (!hasCourtNumber) console.log('      ❌ courtNumber es NULL');
    if (!apiHasRecycledSlots) console.log('      ❌ hasRecycledSlots es false');
    if (apiAvailableRecycledSlots === 0) console.log('      ❌ availableRecycledSlots es 0');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  await prisma.$disconnect();
}

verifyAPI().catch(console.error);

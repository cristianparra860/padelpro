// Script para simular exactamente lo que hace la API /timeslots
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPILogic() {
  console.log('\n🔍 SIMULANDO LÓGICA DE /api/timeslots\n');
  console.log('='.repeat(60));
  
  const date = '2025-12-15';
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();

  console.log(`\n📅 Buscando slots para: ${date}`);
  console.log(`   Timestamp range: ${startTimestamp} - ${endTimestamp}\n`);

  // Query exacta de la API
  const timeSlots = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE start >= ${startTimestamp}
      AND start <= ${endTimestamp}
      AND courtId IS NOT NULL
    ORDER BY start ASC
  `);

  console.log(`✅ Total slots con pista asignada: ${timeSlots.length}\n`);

  // Buscar slot de María Fernández
  const mariaSlot = timeSlots.find(s => {
    const slotDate = new Date(Number(s.start));
    return slotDate.getHours() === 9 && slotDate.getMinutes() === 0;
  });

  if (!mariaSlot) {
    console.log('❌ No se encontró slot a las 09:00');
    await prisma.$disconnect();
    return;
  }

  console.log(`📍 SLOT ENCONTRADO: ${mariaSlot.id}`);
  console.log(`   Instructor ID: ${mariaSlot.instructorId}`);
  console.log(`   Court ID: ${mariaSlot.courtId}`);
  console.log(`   Court Number: ${mariaSlot.courtNumber}\n`);

  // Get instructor name
  if (mariaSlot.instructorId) {
    const instructor = await prisma.instructor.findUnique({
      where: { id: mariaSlot.instructorId },
      include: { user: true }
    });
    if (instructor) {
      console.log(`👤 Instructor: ${instructor.user.name}\n`);
    }
  }

  // Get bookings (lógica exacta de la API)
  const bookings = await prisma.booking.findMany({
    where: { timeSlotId: mariaSlot.id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          level: true,
          position: true,
          profilePictureUrl: true
        }
      }
    }
  });

  console.log(`📋 Total bookings: ${bookings.length}\n`);

  // Calcular plazas recicladas (LÓGICA EXACTA de route.ts líneas 267-277)
  const recycledBookings = bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
  
  const availableRecycledSlots = recycledBookings.reduce(
    (sum, b) => sum + (Number(b.groupSize) || 1), 
    0
  );
  const hasRecycledSlots = availableRecycledSlots > 0;

  console.log('♻️  CÁLCULO DE PLAZAS RECICLADAS:');
  console.log(`   Bookings reciclados: ${recycledBookings.length}`);
  console.log(`   Bookings activos: ${activeBookings.length}`);
  console.log(`   availableRecycledSlots: ${availableRecycledSlots}`);
  console.log(`   hasRecycledSlots: ${hasRecycledSlots}`);
  console.log(`   recycledSlotsOnlyPoints: ${hasRecycledSlots}\n`);

  if (recycledBookings.length > 0) {
    console.log('   📝 Detalles de bookings reciclados:');
    recycledBookings.forEach(b => {
      console.log(`      - ${b.user.name}: groupSize=${b.groupSize}, status=${b.status}, isRecycled=${b.isRecycled}`);
    });
    console.log();
  }

  // Simular el objeto que devolvería la API (líneas 397-430)
  const apiResponse = {
    id: mariaSlot.id,
    courtNumber: mariaSlot.courtNumber,
    hasRecycledSlots: hasRecycledSlots,
    availableRecycledSlots: availableRecycledSlots,
    recycledSlotsOnlyPoints: hasRecycledSlots
  };

  console.log('📡 RESPUESTA DE LA API (campos relevantes):');
  console.log(JSON.stringify(apiResponse, null, 2));
  console.log();

  // Simular lógica del componente (ClassCardReal.tsx líneas 1026-1032)
  const hasCourtNumber = apiResponse.courtNumber != null && apiResponse.courtNumber > 0;
  const shouldShowBadge = hasCourtNumber && apiResponse.hasRecycledSlots && apiResponse.availableRecycledSlots > 0;

  console.log('🎨 LÓGICA DEL COMPONENTE:');
  console.log(`   hasCourtNumber: ${hasCourtNumber} (courtNumber=${apiResponse.courtNumber})`);
  console.log(`   hasRecycledSlots: ${apiResponse.hasRecycledSlots}`);
  console.log(`   availableRecycledSlots: ${apiResponse.availableRecycledSlots}`);
  console.log(`   shouldShowBadge: ${shouldShowBadge}\n`);

  console.log('='.repeat(60));
  if (shouldShowBadge) {
    console.log('\n✅ RESULTADO: Badge ♻️ DEBE MOSTRARSE');
    console.log(`   Texto: "${apiResponse.availableRecycledSlots} plaza${apiResponse.availableRecycledSlots !== 1 ? 's' : ''} reciclada${apiResponse.availableRecycledSlots !== 1 ? 's' : ''}"`);
    console.log(`   Solo con puntos\n`);
  } else {
    console.log('\n❌ RESULTADO: Badge NO se mostrará');
    if (!hasCourtNumber) console.log('   Razón: courtNumber es null o 0');
    if (!apiResponse.hasRecycledSlots) console.log('   Razón: hasRecycledSlots es false');
    if (apiResponse.availableRecycledSlots === 0) console.log('   Razón: availableRecycledSlots es 0');
    console.log();
  }

  await prisma.$disconnect();
}

testAPILogic().catch(console.error);

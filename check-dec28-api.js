const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDec28API() {
  console.log('\n🔍 VERIFICANDO API PARA 28 DICIEMBRE\n');
  console.log('='.repeat(60));
  
  const date = '2025-12-28';
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();

  // Query exacta de la API
  const timeSlots = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE start >= ${startTimestamp}
      AND start <= ${endTimestamp}
      AND courtId IS NOT NULL
    ORDER BY start ASC
  `);

  console.log(`✅ Total slots: ${timeSlots.length}\n`);

  for (const slot of timeSlots) {
    const startDate = new Date(Number(slot.start));
    const instructor = await prisma.instructor.findUnique({
      where: { id: slot.instructorId },
      include: { user: true }
    });

    const bookings = await prisma.booking.findMany({
      where: { timeSlotId: slot.id },
      include: { user: { select: { name: true } } }
    });

    const recycledBookings = bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
    const availableRecycledSlots = recycledBookings.reduce((sum, b) => sum + b.groupSize, 0);
    const hasRecycledSlots = availableRecycledSlots > 0;

    console.log(`📍 ${instructor?.user.name || 'N/A'} - ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - Pista ${slot.courtNumber}`);
    console.log(`   Slot ID: ${slot.id.substring(0, 25)}...`);
    console.log(`   Bookings totales: ${bookings.length}`);
    console.log(`   Bookings reciclados: ${recycledBookings.length}`);
    
    if (recycledBookings.length > 0) {
      recycledBookings.forEach(b => {
        console.log(`      - ${b.user.name}: groupSize=${b.groupSize}, status=${b.status}, isRecycled=${b.isRecycled}`);
      });
    }
    
    console.log(`   hasRecycledSlots: ${hasRecycledSlots}`);
    console.log(`   availableRecycledSlots: ${availableRecycledSlots}`);
    console.log(`   recycledSlotsOnlyPoints: ${hasRecycledSlots}`);
    
    // Check what frontend will calculate
    const hasCourtNumber = slot.courtNumber != null && slot.courtNumber > 0;
    const shouldShowBadge = hasCourtNumber && hasRecycledSlots && availableRecycledSlots > 0;
    console.log(`   shouldShowBadge: ${shouldShowBadge} (courtNumber=${slot.courtNumber}, hasRecycled=${hasRecycledSlots}, available=${availableRecycledSlots})`);
    
    if (shouldShowBadge) {
      console.log(`   ✅ BADGE DEBE MOSTRARSE: "♻️ ${availableRecycledSlots} plaza${availableRecycledSlots !== 1 ? 's' : ''} reciclada${availableRecycledSlots !== 1 ? 's' : ''}"`);
    } else {
      console.log(`   ❌ Badge NO se mostrará`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

checkDec28API().catch(console.error);

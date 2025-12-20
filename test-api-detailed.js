const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  try {
    const targetSlotId = 'ts-1764308197680-dpjdjcrk1ah';
    
    // 1. Query directa del slot
    console.log('\n🔍 1. SLOT DIRECTO:');
    const slot = await prisma.timeSlot.findUnique({
      where: { id: targetSlotId },
      include: {
        bookings: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        instructor: { select: { name: true } },
        court: { select: { number: true } }
      }
    });
    
    console.log('Slot:', {
      id: slot.id,
      start: new Date(slot.start).toLocaleString('es-ES'),
      hasRecycledSlots: slot.hasRecycledSlots,
      availableRecycledSlots: slot.availableRecycledSlots,
      recycledSlotsOnlyPoints: slot.recycledSlotsOnlyPoints,
      courtId: slot.courtId,
      instructor: slot.instructor?.name
    });
    
    console.log('\n📋 Bookings del slot:');
    slot.bookings.forEach((booking, i) => {
      console.log(`  ${i + 1}. ${booking.user.name} (${booking.user.email})`);
      console.log(`     Status: ${booking.status}`);
      console.log(`     isRecycled: ${booking.isRecycled}`);
      console.log(`     groupSize: ${booking.groupSize}`);
      console.log('');
    });
    
    // 2. Query simulando el API endpoint con OR condition
    console.log('\n🔍 2. QUERY CON OR CONDITION (como el API):');
    const bookingsWithOR = await prisma.booking.findMany({
      where: {
        timeSlotId: targetSlotId,
        OR: [
          { status: { in: ['PENDING', 'CONFIRMED'] } },
          { status: 'CANCELLED', isRecycled: true }
        ]
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    console.log(`Encontrados ${bookingsWithOR.length} bookings:`);
    bookingsWithOR.forEach((booking, i) => {
      console.log(`  ${i + 1}. ${booking.user.name} - ${booking.status} - isRecycled: ${booking.isRecycled}`);
    });
    
    // 3. Query SIN OR condition (antes del fix)
    console.log('\n🔍 3. QUERY SIN OR CONDITION (antes del fix):');
    const bookingsWithoutOR = await prisma.booking.findMany({
      where: {
        timeSlotId: targetSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    console.log(`Encontrados ${bookingsWithoutOR.length} bookings:`);
    bookingsWithoutOR.forEach((booking, i) => {
      console.log(`  ${i + 1}. ${booking.user.name} - ${booking.status}`);
    });
    
    console.log('\n✅ CONCLUSIÓN:');
    console.log(`- Con OR: ${bookingsWithOR.length} bookings (incluye reciclados)`);
    console.log(`- Sin OR: ${bookingsWithoutOR.length} bookings (solo activos)`);
    console.log(`- Diferencia: ${bookingsWithOR.length - bookingsWithoutOR.length} bookings reciclados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();

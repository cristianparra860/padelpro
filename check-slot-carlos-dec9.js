const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlot() {
  try {
    const slot = await prisma.timeSlot.findFirst({
      where: {
        id: 'ts-1764308197680-dpjdjcrk1ah'
      },
      include: {
        bookings: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!slot) {
      console.log('❌ Slot no encontrado');
      return;
    }

    console.log('🔍 SLOT Carlos Rodríguez - 9 Dic 09:00:');
    console.log('ID:', slot.id);
    console.log('Instructor:', slot.instructorName);
    console.log('Start:', new Date(slot.start));
    console.log('hasRecycledSlots:', slot.hasRecycledSlots);
    console.log('availableRecycledSlots:', slot.availableRecycledSlots);
    console.log('recycledSlotsOnlyPoints:', slot.recycledSlotsOnlyPoints);
    console.log('\n📋 BOOKINGS:');
    
    slot.bookings.forEach((booking, idx) => {
      console.log(`\n  ${idx + 1}. Booking ${booking.id}:`);
      console.log(`     - Usuario: ${booking.userId}`);
      console.log(`     - Nombre: ${booking.name || 'N/A'}`);
      console.log(`     - Status: ${booking.status}`);
      console.log(`     - GroupSize: ${booking.groupSize}`);
      console.log(`     - CreatedAt: ${booking.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlot();

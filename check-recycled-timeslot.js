const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecycledTimeSlot() {
  try {
    // Buscar el TimeSlot de la clase reciclada
    const slot = await prisma.timeSlot.findFirst({
      where: {
        id: 'ts-1764308203959-18m440tcke'
      },
      include: {
        bookings: {
          where: {
            status: 'CANCELLED',
            isRecycled: true
          }
        },
        instructor: true
      }
    });

    console.log('📍 TimeSlot encontrado:');
    console.log(JSON.stringify(slot, null, 2));
    console.log('\n🔍 Detalles clave:');
    console.log('- ID:', slot?.id);
    console.log('- courtId:', slot?.courtId);
    console.log('- courtNumber:', slot?.courtNumber);
    console.log('- Instructor:', slot?.instructor?.name);
    console.log('- Bookings recicladas:', slot?.bookings?.length || 0);
    
    if (slot?.bookings && slot.bookings.length > 0) {
      console.log('\n📋 Booking reciclada:');
      slot.bookings.forEach(b => {
        console.log(`  - ID: ${b.id}`);
        console.log(`  - Status: ${b.status}`);
        console.log(`  - isRecycled: ${b.isRecycled}`);
        console.log(`  - wasConfirmed: ${b.wasConfirmed}`);
        console.log(`  - groupSize: ${b.groupSize}`);
      });
    }

    // Verificar si aparecería en el query de /api/timeslots
    console.log('\n🔎 ¿Aparecería en /api/timeslots?');
    console.log('- courtId es NULL:', slot?.courtId === null);
    console.log('- Tiene bookings recicladas:', (slot?.bookings?.length || 0) > 0);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecycledTimeSlot();

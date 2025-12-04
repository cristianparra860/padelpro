const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsDisplay() {
  try {
    // Encontrar una clase con bookings
    const slot = await prisma.timeSlot.findFirst({
      where: {
        bookings: {
          some: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      include: {
        instructor: true,
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { user: true }
        }
      }
    });

    if (!slot) {
      console.log('No hay clases con bookings');
      return;
    }

    console.log('✅ Clase encontrada:', slot.id.substring(0, 20));
    console.log('📋 Bookings en DB:', slot.bookings.length);
    
    slot.bookings.forEach((b, i) => {
      console.log(`\n${i + 1}. Booking ${b.id.substring(0, 20)}`);
      console.log(`   User: ${b.user.name}`);
      console.log(`   Level: ${b.user.level}`);
      console.log(`   GroupSize: ${b.groupSize}`);
      console.log(`   ProfilePic: ${b.user.profilePictureUrl ? 'SÍ' : 'NO'}`);
    });

    // Simular lo que devuelve el API
    console.log('\n📦 Lo que devolvería /api/timeslots:');
    const formattedBookings = slot.bookings.map(b => ({
      id: b.id,
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status,
      userName: b.user.name,
      userLevel: b.user.level,
      userGender: b.user.position,
      profilePictureUrl: b.user.profilePictureUrl
    }));

    console.log(JSON.stringify(formattedBookings, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingsDisplay();

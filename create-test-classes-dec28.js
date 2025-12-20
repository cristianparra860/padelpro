const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestClasses() {
  console.log('\n🎾 CREANDO CLASES DE PRUEBA PARA 28 DICIEMBRE 2025\n');
  console.log('='.repeat(60));

  try {
    // Get club
    const club = await prisma.club.findFirst();
    if (!club) {
      console.log('❌ No se encontró ningún club');
      return;
    }
    console.log(`✅ Club: ${club.name}`);

    // Get instructors
    const instructors = await prisma.instructor.findMany({
      include: { user: true },
      take: 3
    });
    console.log(`✅ Instructores: ${instructors.length}`);

    // Get courts
    const courts = await prisma.court.findMany({
      where: { clubId: club.id }
    });
    console.log(`✅ Pistas: ${courts.length}`);

    // Get a user for booking
    const user = await prisma.user.findFirst({
      where: { role: 'PLAYER' }
    });
    console.log(`✅ Usuario: ${user.name}\n`);

    // Create classes for Dec 28, 2025
    const date = new Date('2025-12-28T09:00:00');
    const timeSlots = [];

    for (let i = 0; i < 3; i++) {
      const startTime = new Date(date);
      startTime.setHours(9 + i, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(30);

      const instructor = instructors[i % instructors.length];
      const court = courts[i % courts.length];

      const slot = await prisma.timeSlot.create({
        data: {
          clubId: club.id,
          courtId: court.id,
          courtNumber: court.number,
          instructorId: instructor.id,
          start: startTime,
          end: endTime,
          maxPlayers: 4,
          instructorPrice: 15,
          courtRentalPrice: 10,
          totalPrice: 25,
          level: 'intermedio',
          category: 'adultos',
          genderCategory: 'mixto',
          hasRecycledSlots: false,
          availableRecycledSlots: 0,
          recycledSlotsOnlyPoints: false,
          creditsCost: 50
        }
      });

      console.log(`✅ Clase creada: ${instructor.user.name} - ${startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - Pista ${court.number}`);
      timeSlots.push({ slot, instructor: instructor.user.name });
    }

    console.log('\n📝 CREANDO BOOKINGS...\n');

    // Create booking in first class
    const firstSlot = timeSlots[0].slot;
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: firstSlot.id,
        groupSize: 2,
        amountBlocked: 25,
        status: 'CONFIRMED',
        isRecycled: false
      }
    });

    console.log(`✅ Booking creado: ${user.name} - ${firstSlot.id.substring(0, 20)}...`);
    console.log(`   GroupSize: 2, Amount: €25, Status: CONFIRMED\n`);

    // Now cancel it and mark as recycled
    console.log('♻️  CANCELANDO BOOKING Y MARCANDO COMO RECICLADO...\n');

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        isRecycled: true
      }
    });

    // Grant compensation points
    const pointsToGrant = Math.floor(booking.amountBlocked);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        points: { increment: pointsToGrant }
      }
    });

    console.log(`✅ Booking cancelado y marcado como reciclado`);
    console.log(`✅ Otorgados ${pointsToGrant} puntos al usuario\n`);

    // Verify the result
    console.log('='.repeat(60));
    console.log('\n🔍 VERIFICACIÓN FINAL:\n');

    const verifySlot = await prisma.timeSlot.findUnique({
      where: { id: firstSlot.id },
      include: {
        bookings: {
          include: { user: true }
        }
      }
    });

    const recycledBookings = verifySlot.bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
    const availableRecycledSlots = recycledBookings.reduce((sum, b) => sum + b.groupSize, 0);
    const hasRecycledSlots = availableRecycledSlots > 0;

    console.log(`📅 Clase: ${timeSlots[0].instructor} - 28 Diciembre 09:00 - Pista ${verifySlot.courtNumber}`);
    console.log(`   Court ID: ${verifySlot.courtId}`);
    console.log(`   Court Number: ${verifySlot.courtNumber}`);
    console.log(`   Bookings totales: ${verifySlot.bookings.length}`);
    console.log(`   Bookings reciclados: ${recycledBookings.length}`);
    console.log(`   availableRecycledSlots: ${availableRecycledSlots}`);
    console.log(`   hasRecycledSlots: ${hasRecycledSlots}\n`);

    console.log('🎯 EN LA API /timeslots DEBE DEVOLVER:');
    console.log(`   hasRecycledSlots: ${hasRecycledSlots}`);
    console.log(`   availableRecycledSlots: ${availableRecycledSlots}`);
    console.log(`   recycledSlotsOnlyPoints: ${hasRecycledSlots}\n`);

    console.log('🎨 EN EL FRONTEND DEBE MOSTRAR:');
    console.log(`   Badge: ♻️ ${availableRecycledSlots} plaza${availableRecycledSlots !== 1 ? 's' : ''} reciclada${availableRecycledSlots !== 1 ? 's' : ''}`);
    console.log(`   Solo con puntos\n`);

    console.log('='.repeat(60));
    console.log('\n✅ LISTO! Ve al navegador:');
    console.log('   1. Abre http://localhost:9002');
    console.log('   2. Navega al 28 de diciembre');
    console.log(`   3. Busca la clase de ${timeSlots[0].instructor} a las 09:00`);
    console.log('   4. Deberías ver el badge amarillo con el icono ♻️\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestClasses();

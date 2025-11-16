/**
 * Crear una reserva de prueba para testear la cancelación
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔵 Creando reserva de prueba...\n');

  try {
    // 1. Buscar usuario Alex
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Alex' } },
          { email: { contains: 'alex' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario: ${user.name}`);

    // 2. Buscar un TimeSlot futuro SIN courtId (propuesta)
    const now = Date.now();
    const futureSlot = await prisma.timeSlot.findFirst({
      where: {
        start: { gt: new Date(now) },
        courtId: null,
        clubId: 'cm3ty6gdi0001qvp07gqwqwj2' // Padel Estrella
      },
      include: {
        instructor: true
      },
      orderBy: {
        start: 'asc'
      }
    });

    if (!futureSlot) {
      console.log('❌ No hay TimeSlots disponibles');
      return;
    }

    console.log(`✅ TimeSlot encontrado:`);
    console.log(`   ID: ${futureSlot.id}`);
    console.log(`   Start: ${new Date(futureSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${futureSlot.instructor?.name || 'N/A'}`);

    // 3. Obtener pistas disponibles
    const courts = await prisma.court.findMany({
      where: { clubId: futureSlot.clubId },
      orderBy: { number: 'asc' }
    });

    if (courts.length === 0) {
      console.log('❌ No hay pistas disponibles');
      return;
    }

    const court = courts[0];
    console.log(`✅ Pista seleccionada: ${court.number}`);

    // 4. Crear booking con groupSize = 4 para que se complete inmediatamente
    console.log('\n🔵 Creando booking...');
    
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: futureSlot.id,
        groupSize: 4,
        status: 'CONFIRMED',
        creditsUsed: 10
      }
    });

    console.log(`✅ Booking creado: ${booking.id}`);

    // 5. Asignar pista al TimeSlot (simular confirmación)
    console.log('\n🔵 Asignando pista al TimeSlot...');
    
    await prisma.timeSlot.update({
      where: { id: futureSlot.id },
      data: {
        courtId: court.id,
        courtNumber: court.number,
        genderCategory: user.genderCategory || 'mixto'
      }
    });

    console.log('✅ TimeSlot confirmado con pista asignada');

    // 6. Crear CourtSchedule
    await prisma.courtSchedule.create({
      data: {
        courtId: court.id,
        timeSlotId: futureSlot.id,
        start: futureSlot.start,
        end: futureSlot.end
      }
    });

    console.log('✅ CourtSchedule creado');

    // 7. Crear InstructorSchedule
    if (futureSlot.instructorId) {
      await prisma.instructorSchedule.create({
        data: {
          instructorId: futureSlot.instructorId,
          timeSlotId: futureSlot.id,
          start: futureSlot.start,
          end: futureSlot.end
        }
      });
      console.log('✅ InstructorSchedule creado');
    }

    // 8. Verificar resultado
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: futureSlot.id },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });

    console.log('\n📊 RESULTADO:');
    console.log(`   TimeSlot ID: ${updatedSlot?.id}`);
    console.log(`   CourtId: ${updatedSlot?.courtId || 'NULL'}`);
    console.log(`   CourtNumber: ${updatedSlot?.courtNumber || 'NULL'}`);
    console.log(`   Bookings activos: ${updatedSlot?.bookings.length || 0}`);
    
    console.log('\n✨ Reserva de prueba creada exitosamente');
    console.log(`📝 Usa este BookingId para el test: ${booking.id}`);
    console.log(`📝 TimeSlotId: ${futureSlot.id}`);

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

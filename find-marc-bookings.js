const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMarcBooking() {
  try {
    // Buscar todas las reservas de Marc Parra
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id as bookingId,
        b.timeSlotId,
        b.status,
        b.groupSize,
        u.name as userName,
        u.level as userLevel,
        ts.start,
        ts.level as slotLevel,
        ts.levelRange,
        ts.genderCategory,
        ts.instructorId
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE u.name LIKE '%Marc%'
      AND b.status != 'CANCELLED'
      ORDER BY ts.start ASC
    `;
    
    console.log('\n📋 Todas las reservas de Marc Parra:');
    console.log('═══════════════════════════════════════════');
    
    if (bookings.length === 0) {
      console.log('⚠️ No se encontraron reservas activas');
    } else {
      bookings.forEach((booking, i) => {
        const date = new Date(Number(booking.start));
        console.log(`\n📍 Reserva ${i + 1}:`);
        console.log(`  Booking ID: ${booking.bookingId}`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Group Size: ${booking.groupSize}`);
        console.log(`  Fecha/Hora: ${date.toLocaleString('es-ES')}`);
        console.log(`  Usuario: ${booking.userName} (Nivel: ${booking.userLevel})`);
        console.log(`  TimeSlot ID: ${booking.timeSlotId}`);
        console.log(`  Slot Level: ${booking.slotLevel}`);
        console.log(`  Slot LevelRange: ${booking.levelRange || 'NULL ❌'}`);
        console.log(`  Slot GenderCategory: ${booking.genderCategory || 'NULL'}`);
        console.log(`  InstructorId: ${booking.instructorId}`);
        
        if (!booking.levelRange) {
          console.log(`  ⚠️ ESTE SLOT NO TIENE levelRange ASIGNADO`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findMarcBooking();

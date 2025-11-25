const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  try {
    // Buscar la reserva de Marc Parra del día 26
    const marcBooking = await prisma.booking.findFirst({
      where: {
        user: {
          email: 'jugador1@padelpro.com'
        },
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: {
          include: {
            instructor: true
          }
        },
        user: true
      }
    });
    
    if (!marcBooking) {
      console.log('❌ No se encontró la reserva de Marc Parra');
      return;
    }
    
    console.log('📅 Reserva de Marc Parra:');
    console.log('   Booking ID:', marcBooking.id);
    console.log('   Status:', marcBooking.status);
    console.log('   User:', marcBooking.user.name);
    console.log('   TimeSlot ID:', marcBooking.timeSlot.id);
    
    const startDate = new Date(Number(marcBooking.timeSlot.start));
    console.log('   Fecha:', startDate.toLocaleString('es-ES'));
    console.log('   Instructor ID (en TimeSlot):', marcBooking.timeSlot.instructorId);
    
    if (marcBooking.timeSlot.instructor) {
      console.log('   Instructor (tabla):', {
        id: marcBooking.timeSlot.instructor.id,
        name: marcBooking.timeSlot.instructor.name,
        userId: marcBooking.timeSlot.instructor.userId
      });
    } else {
      console.log('   ⚠️ No hay instructor vinculado');
    }
    
    // Verificar el instructor Carlos Ruiz
    const carlosInstructor = await prisma.instructor.findFirst({
      where: { name: 'Carlos Ruiz' }
    });
    
    console.log('\n👨‍🏫 Carlos Ruiz (tabla Instructor):');
    console.log('   ID:', carlosInstructor?.id);
    console.log('   UserId:', carlosInstructor?.userId);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorBookings() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'instructor@gmail.com' }
    });
    
    console.log('Usuario:', user.name, user.id);
    console.log('');
    
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: { 
        timeSlot: {
          select: {
            start: true,
            courtNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`Total reservas de clases: ${bookings.length}\n`);
    
    const now = new Date();
    
    bookings.forEach((b, i) => {
      const startDate = new Date(b.timeSlot.start);
      const isPast = startDate < now;
      
      console.log(`${i + 1}. Booking ID: ${b.id}`);
      console.log(`   Fecha: ${startDate.toLocaleString('es-ES')}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Es pasada: ${isPast ? 'SÍ' : 'NO'}`);
      console.log(`   Pista: ${b.timeSlot.courtNumber || 'Sin asignar'}`);
      console.log(`   hiddenFromHistory: ${b.hiddenFromHistory}`);
      console.log('');
    });
    
    // Verificar matchgames también
    const matchBookings = await prisma.matchGameBooking.findMany({
      where: { userId: user.id },
      include: {
        matchGame: {
          select: {
            start: true,
            courtNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`\nTotal reservas de partidas: ${matchBookings.length}\n`);
    
    matchBookings.forEach((b, i) => {
      const startDate = new Date(b.matchGame.start);
      const isPast = startDate < now;
      
      console.log(`${i + 1}. Match Booking ID: ${b.id}`);
      console.log(`   Fecha: ${startDate.toLocaleString('es-ES')}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Es pasada: ${isPast ? 'SÍ' : 'NO'}`);
      console.log(`   Pista: ${b.matchGame.courtNumber || 'Sin asignar'}`);
      console.log(`   hiddenFromHistory: ${b.hiddenFromHistory}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorBookings();

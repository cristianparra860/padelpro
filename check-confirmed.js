const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfirmedClasses() {
  console.log(' Verificando clases confirmadas...\n');
  
  // Ver clases con courtNumber asignado
  const confirmed = await prisma.timeSlot.findMany({
    where: { 
      courtNumber: { not: null }
    },
    include: {
      instructor: {
        include: {
          user: true
        }
      },
      bookings: {
        include: {
          user: true
        }
      }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(` Total clases confirmadas: ${confirmed.length}\n`);
  
  if (confirmed.length > 0) {
    confirmed.forEach(cls => {
      const start = new Date(cls.start);
      const dateStr = start.toISOString().split('T')[0];
      const timeStr = start.toTimeString().split(' ')[0].substring(0, 5);
      
      console.log(` Clase confirmada:`);
      console.log(`   Fecha: ${dateStr} ${timeStr}`);
      console.log(`   Pista: ${cls.courtNumber}`);
      console.log(`   Instructor: ${cls.instructor?.user?.name || 'N/A'}`);
      console.log(`   Reservas: ${cls.bookings?.length || 0}`);
      cls.bookings?.forEach(b => {
        console.log(`      - ${b.user.name} (${b.groupSize} jugadores)`);
      });
      console.log('');
    });
  } else {
    console.log(' No hay clases confirmadas\n');
    
    // Verificar si hay bookings sin courtNumber
    const bookings = await prisma.booking.findMany({
      include: {
        timeSlot: true,
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(' Últimas 5 reservas:\n');
    bookings.forEach(b => {
      console.log(`- ${b.user.name}`);
      console.log(`  TimeSlot: ${b.timeSlotId}`);
      console.log(`  CourtNumber: ${b.timeSlot.courtNumber || 'NULL'}`);
      console.log(`  GroupSize: ${b.groupSize}`);
      console.log(`  Status: ${b.status}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkConfirmedClasses();

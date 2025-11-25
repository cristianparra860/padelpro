const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay25CarlosSlot() {
  console.log('🔍 Verificando TimeSlot de Carlos Martinez día 25 a las 08:00\n');
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      clubId: 'padel-estrella-madrid',
      start: {
        gte: new Date('2025-11-25T08:00:00.000Z'),
        lte: new Date('2025-11-25T08:30:00.000Z')
      }
    },
    include: {
      instructor: true,
      bookings: {
        include: {
          user: true
        }
      }
    }
  });
  
  console.log(`📊 TimeSlots encontrados a las 08:00: ${slots.length}\n`);
  
  slots.forEach(slot => {
    const instructor = slot.instructor?.name || 'Sin instructor';
    const time = new Date(slot.start).toISOString().substring(11, 16);
    
    console.log(`🎯 ${time} | ${instructor} | ${slot.level} | ${slot.genderCategory || 'sin cat'}`);
    console.log(`   TimeSlot ID: ${slot.id}`);
    console.log(`   Pista: ${slot.courtNumber || 'NULL (propuesta)'}`);
    console.log(`   Reservas: ${slot.bookings.length}`);
    
    if (slot.bookings.length > 0) {
      console.log('   📋 Bookings:');
      slot.bookings.forEach(b => {
        console.log(`      - ${b.user?.name || 'Usuario desconocido'} | ${b.status} | Grupo: ${b.groupSize}`);
        console.log(`        Booking ID: ${b.id}`);
      });
    }
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkDay25CarlosSlot();

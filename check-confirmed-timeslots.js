const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('\n🔍 Buscando TimeSlots confirmados (con courtId)...\n');
    
    const confirmedSlots = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      include: {
        instructor: {
          select: {
            name: true,
            profilePicture: true
          }
        },
        bookings: {
          select: {
            id: true,
            userId: true,
            groupSize: true
          }
        }
      },
      take: 10,
      orderBy: { start: 'asc' }
    });
    
    console.log(`📊 Total de TimeSlots confirmados: ${confirmedSlots.length}\n`);
    
    confirmedSlots.forEach(slot => {
      const date = new Date(slot.start);
      console.log(`🎯 TimeSlot ID: ${slot.id}`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log(`   CourtId: ${slot.courtId}`);
      console.log(`   CourtNumber: ${slot.courtNumber}`);
      console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
      console.log(`   Reservas: ${slot.bookings.length}`);
      console.log(`   MaxPlayers: ${slot.maxPlayers}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

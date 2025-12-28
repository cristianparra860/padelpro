const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('\n🔍 Buscando clase confirmada de Carlos Rodriguez...\n');
    
    const confirmedSlot = await prisma.timeSlot.findFirst({
      where: {
        courtId: { not: null },
        start: { gte: new Date('2025-12-27T00:00:00') }
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
            groupSize: true,
            status: true
          }
        }
      }
    });
    
    if (!confirmedSlot) {
      console.log('❌ No se encontró clase confirmada');
      return;
    }
    
    console.log('✅ Clase confirmada encontrada:');
    console.log('   ID:', confirmedSlot.id);
    console.log('   CourtId:', confirmedSlot.courtId);
    console.log('   CourtNumber:', confirmedSlot.courtNumber);
    console.log('   Start:', new Date(confirmedSlot.start).toLocaleString('es-ES'));
    console.log('   Instructor:', confirmedSlot.instructor?.name);
    console.log('   Bookings:', confirmedSlot.bookings.length);
    console.log('   MaxPlayers:', confirmedSlot.maxPlayers);
    
    const timeSlotString = new Date(confirmedSlot.start).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    console.log('   TimeSlot string (para match):', timeSlotString);
    
    console.log('\n📝 Estructura completa:', JSON.stringify({
      id: confirmedSlot.id,
      courtId: confirmedSlot.courtId,
      courtNumber: confirmedSlot.courtNumber,
      start: confirmedSlot.start,
      timeSlotString,
      maxPlayers: confirmedSlot.maxPlayers,
      bookingsCount: confirmedSlot.bookings.length
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();

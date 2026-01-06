const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const timeSlotId = 'cmjqopsge009ztgr877f0pc7z';
    
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        bookings: {
          include: {
            user: true
          }
        },
        instructor: true
      }
    });
    
    console.log('TimeSlot completo:', JSON.stringify(timeSlot, null, 2));
    
    // Ver si hay otro TimeSlot en el mismo horario
    const sameDateSlots = await prisma.timeSlot.findMany({
      where: {
        start: timeSlot.start,
        instructorId: timeSlot.instructorId
      },
      include: {
        bookings: true
      }
    });
    
    console.log(`\nTimeSlots en ${new Date(timeSlot.start).toLocaleString()}:`, sameDateSlots.length);
    sameDateSlots.forEach((slot, i) => {
      console.log(`\n${i+1}. ID: ${slot.id}`);
      console.log(`   Nivel: ${slot.level}`);
      console.log(`   LevelRange: ${slot.levelRange}`);
      console.log(`   Género: ${slot.genderCategory}`);
      console.log(`   Bookings: ${slot.bookings.length}`);
      console.log(`   CourtId: ${slot.courtId || 'null'}`);
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

main();

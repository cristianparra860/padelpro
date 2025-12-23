const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTimeSlotsNow() {
  try {
    const allSlots = await prisma.timeSlot.findMany({
      include: {
        instructor: { select: { name: true } },
        club: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📊 Total TimeSlots: ${allSlots.length}\n`);

    allSlots.forEach((slot, idx) => {
      const start = new Date(Number(slot.start));
      const end = new Date(Number(slot.end));
      
      console.log(`${idx + 1}. ${slot.id}`);
      console.log(`   Instructor: ${slot.instructor?.name}`);
      console.log(`   Club: ${slot.club?.name}`);
      console.log(`   Fecha: ${start.toLocaleString('es-ES')}`);
      console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTimeSlotsNow();

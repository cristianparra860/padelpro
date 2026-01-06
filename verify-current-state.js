const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyState() {
  try {
    // Verificar TimeSlots del 05/01/2026 para Pedro López
    const slots = await prisma.timeSlot.findMany({
      where: {
        clubId: 'club-1',
        start: {
          gte: new Date('2026-01-05T08:00:00.000Z'),
          lte: new Date('2026-01-05T12:00:00.000Z')
        },
        courtId: null,
        instructor: {
          name: { contains: 'Pedro' }
        }
      },
      select: {
        id: true,
        start: true,
        levelRange: true,
        level: true,
        instructor: { select: { name: true } },
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`\n📊 Estado actual - TimeSlots de Pedro López (05/01/2026, 08:00-12:00):\n`);
    
    const grouped = {};
    slots.forEach(slot => {
      const hour = new Date(slot.start).toISOString().substring(11, 16);
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push({
        levelRange: slot.levelRange || slot.level,
        bookings: slot.bookings.length
      });
    });
    
    Object.entries(grouped).forEach(([hour, slots]) => {
      console.log(`${hour}: ${slots.length} clase(s)`);
      slots.forEach((s, i) => {
        console.log(`   ${i+1}. Nivel: ${s.levelRange || 'N/A'} | Bookings: ${s.bookings}`);
      });
    });
    
    console.log(`\n✅ Total: ${slots.length} clases encontradas`);
    console.log(`💡 Si ves más de 1 clase por hora, aún hay duplicados\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyState();

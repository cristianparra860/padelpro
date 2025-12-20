const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateFormats() {
  try {
    console.log('\n🔍 Verificando formatos de fecha en SQLite:\n');
    
    // Verificar TimeSlots del 17 de diciembre
    const slots = await prisma.$queryRaw`
      SELECT id, start
      FROM TimeSlot 
      WHERE start LIKE '2025-12-17%'
      LIMIT 3
    `;
    
    console.log(`📅 TimeSlots del 17 dic (total: ${slots.length}):`);
    slots.forEach(s => {
      console.log(`   ${s.start}`);
    });
    
    // Buscar inscripciones de Marc del 17 dic
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' },
      select: { id: true }
    });
    
    if (marc) {
      const bookings = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.status,
          ts.start,
          ts.courtNumber
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${marc.id}
        AND ts.start LIKE '2025-12-17%'
        ORDER BY ts.start
      `;
      
      console.log(`\n📊 Inscripciones de Marc el 17 dic:`);
      bookings.forEach(b => {
        const hasCourt = b.courtNumber ? `Pista ${b.courtNumber}` : 'SIN PISTA';
        console.log(`   ${b.status} - ${b.start} - ${hasCourt}`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkDateFormats();

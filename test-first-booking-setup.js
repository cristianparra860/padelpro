const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando estado de clases y usuarios...\n');
  
  // Clases vacías - usando raw SQL como indica copilot-instructions.md
  const now = Date.now();
  const slots = await prisma.$queryRaw`
    SELECT 
      ts.*,
      i.name as instructorName,
      i.levelRanges as instructorRanges,
      COUNT(b.id) as bookingCount
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON i.id = ts.instructorId
    LEFT JOIN Booking b ON b.timeSlotId = ts.id
    WHERE ts.courtId IS NULL 
      AND ts.start > ${now}
    GROUP BY ts.id
    ORDER BY ts.start ASC
    LIMIT 3
  `;

  console.log('📅 CLASES DISPONIBLES:\n');
  slots.forEach((slot, i) => {
    const date = new Date(Number(slot.start));
    console.log(`${i + 1}. Clase ID: ${slot.id}`);
    console.log(`   Hora: ${date.toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${slot.instructorName}`);
    console.log(`   Level actual: "${slot.level || 'VACÍO'}"`);
    console.log(`   Gender: ${slot.genderCategory || 'NULL'}`);
    console.log(`   Reservas: ${slot.bookingCount}`);
    
    if (slot.instructorRanges) {
      const ranges = JSON.parse(slot.instructorRanges);
      console.log(`   Rangos instructor: ${ranges.map(r => `${r.minLevel}-${r.maxLevel}`).join(', ')}`);
    }
    console.log('');
  });

  // Usuarios
  console.log('\n👥 USUARIOS PARA PRUEBA:\n');
  const users = await prisma.user.findMany({
    where: {
      gender: { not: null }
    },
    take: 5
  });

  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.name} (${user.email})`);
    console.log(`   Nivel: ${user.level}`);
    console.log(`   Género: ${user.gender}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);

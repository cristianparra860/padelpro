const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Simular la query de la API del calendario para hoy
    const startDate = new Date('2025-11-01T00:00:00.000Z');
    const endDate = new Date('2025-11-30T23:59:59.999Z');
    
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    console.log(`\n🔍 Buscando clases entre ${startISO} y ${endISO}\n`);
    
    const classesRaw = await prisma.$queryRaw`
      SELECT 
        id, start, end, courtId, courtNumber, instructorId
      FROM TimeSlot
      WHERE start >= ${startISO}
        AND start <= ${endISO}
      ORDER BY start ASC
    `;

    console.log(`📊 Total clases encontradas: ${classesRaw.length}\n`);
    
    const confirmed = classesRaw.filter(c => c.courtId !== null);
    const proposed = classesRaw.filter(c => c.courtId === null);
    
    console.log(`✅ Confirmadas (courtId != null): ${confirmed.length}`);
    console.log(`🟠 Propuestas (courtId = null): ${proposed.length}\n`);
    
    if (confirmed.length > 0) {
      console.log('Clases confirmadas:\n');
      confirmed.forEach(c => {
        const start = new Date(c.start);
        console.log(`  ${start.toLocaleDateString('es-ES')} ${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - Pista ${c.courtNumber}`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();

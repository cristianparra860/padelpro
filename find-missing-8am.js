const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMissing8amSlots() {
  try {
    console.log('🔍 BUSCANDO SLOTS ENTRE 7:00-9:00 UTC (8:00-10:00 LOCAL)\n');
    
    // Buscar todos los slots entre 7:00 y 9:00 UTC del 13 de noviembre
    const results = await prisma.$queryRaw`
      SELECT id, start, instructorId, courtNumber
      FROM TimeSlot
      WHERE start >= '2025-11-13T07:00:00.000Z'
        AND start < '2025-11-13T09:00:00.000Z'
      ORDER BY start ASC
    `;
    
    console.log(`Total slots entre 7:00-9:00 UTC: ${results.length}\n`);
    
    if (results.length === 0) {
      console.log('❌ NO HAY SLOTS EN ESE RANGO!\n');
      
      // Buscar el primer slot del día
      const firstSlot = await prisma.$queryRaw`
        SELECT id, start, instructorId
        FROM TimeSlot
        WHERE start >= '2025-11-13T00:00:00.000Z'
          AND start < '2025-11-14T00:00:00.000Z'
        ORDER BY start ASC
        LIMIT 1
      `;
      
      if (firstSlot.length > 0) {
        console.log('Primer slot del día 13/11/2025:');
        const d = new Date(firstSlot[0].start);
        console.log(`  ${d.toISOString()} (${d.toLocaleString('es-ES')})`);
      }
    } else {
      console.log('Slots encontrados:');
      results.forEach(r => {
        const d = new Date(r.start);
        console.log(`  ${d.toISOString()} → ${d.toLocaleTimeString('es-ES')} local`);
      });
    }
    
    // Contar slots por hora UTC
    console.log('\n📊 Distribución por hora UTC del día 13/11:\n');
    
    const distribution = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN start LIKE '2025-11-13T07:%' THEN '07:xx (8 AM local)'
          WHEN start LIKE '2025-11-13T08:%' THEN '08:xx (9 AM local)'
          WHEN start LIKE '2025-11-13T09:%' THEN '09:xx (10 AM local)'
          WHEN start LIKE '2025-11-13T10:%' THEN '10:xx (11 AM local)'
          ELSE 'Otra hora'
        END as hora,
        COUNT(*) as count
      FROM TimeSlot
      WHERE start >= '2025-11-13T00:00:00.000Z'
        AND start < '2025-11-14T00:00:00.000Z'
      GROUP BY hora
      ORDER BY hora
    `;
    
    distribution.forEach(d => {
      console.log(`  ${d.hora}: ${d.count} slots`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissing8amSlots();

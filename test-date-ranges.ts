import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    // Ver TODAS las propuestas
    const all = await prisma.timeSlot.findMany({
      where: { courtId: null },
      select: {
        start: true
      }
    });
    
    console.log(`\n📊 Total propuestas en DB (sin filtro): ${all.length}\n`);
    
    if (all.length > 0) {
      console.log('📅 Rango de fechas:');
      const dates = all.map(t => t.start);
      const min = new Date(Math.min(...dates.map(d => d.getTime())));
      const max = new Date(Math.max(...dates.map(d => d.getTime())));
      console.log(`   Primera: ${min.toISOString()}`);
      console.log(`   Última: ${max.toISOString()}`);
      
      // Ver cuántas hay en octubre en UTC
      const octoberStart = new Date('2025-10-01T00:00:00.000Z');
      const octoberEnd = new Date('2025-10-31T23:59:59.999Z');
      
      const inOctober = all.filter(t => 
        t.start >= octoberStart && t.start <= octoberEnd
      );
      
      console.log(`\n📊 En rango Oct 1-31 (UTC): ${inOctober.length}`);
      
      // Probar el query SQL directo SIN filtro de fechas
      const raw = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM TimeSlot
        WHERE courtId IS NULL
      ` as any[];
      
      console.log(`\n🔍 SQL directo (sin filtro): ${raw[0].total}`);
      
      // Probar con el rango que está usando ahora el API
      const apiStart = '2025-09-30T22:00:00.000Z';
      const apiEnd = '2025-10-31T22:59:59.999Z';
      
      const raw2 = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM TimeSlot
        WHERE courtId IS NULL
          AND start >= ${apiStart}
          AND start <= ${apiEnd}
      ` as any[];
      
      console.log(`\n🔍 SQL con rango API (Sept 30 10PM - Oct 31 10:59PM UTC): ${raw2[0].total}`);
      
      // Probar ampliando el rango
      const wideStart = '2025-10-01T00:00:00.000Z';
      const wideEnd = '2025-11-01T23:59:59.999Z';
      
      const raw3 = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM TimeSlot
        WHERE courtId IS NULL
          AND start >= ${wideStart}
          AND start <= ${wideEnd}
      ` as any[];
      
      console.log(`\n🔍 SQL con rango amplio (Oct 1 - Nov 1): ${raw3[0].total}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();

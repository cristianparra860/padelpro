import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickFix() {
  try {
    console.log('\n🔍 Verificando formato de fechas...\n');
    
    // Ver samples
    const samples = await prisma.timeSlot.findMany({
      where: { courtId: null },
      take: 3,
      orderBy: { start: 'asc' },
      select: {
        start: true,
        end: true
      }
    });
    
    console.log('📋 Samples de la base de datos:');
    samples.forEach((s, i) => {
      console.log(`   ${i + 1}. start: ${s.start.toISOString()}`);
      console.log(`      Hora local: ${s.start.getHours()}:${String(s.start.getMinutes()).padStart(2, '0')}`);
    });
    
    // Probar el SQL query del API
    const startDate = '2025-09-30T22:00:00.000Z';
    const endDate = '2025-10-31T22:59:59.999Z';
    
    console.log(`\n🔍 Buscando con:`);
    console.log(`   startDate: ${startDate}`);
    console.log(`   endDate: ${endDate}`);
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM TimeSlot
      WHERE courtId IS NULL
        AND start >= ${startDate}
        AND start <= ${endDate}
    ` as any[];
    
    console.log(`\n❌ Resultado: ${result[0].total} clases\n`);
    
    // Probar con fechas en hora local
    const localStart = new Date(2025, 9, 1, 0, 0, 0).toISOString();
    const localEnd = new Date(2025, 9, 31, 23, 59, 59).toISOString();
    
    console.log(`🔍 Buscando con fechas locales:`);
    console.log(`   startDate: ${localStart}`);
    console.log(`   endDate: ${localEnd}`);
    
    const result2 = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM TimeSlot
      WHERE courtId IS NULL
        AND start >= ${localStart}
        AND start <= ${localEnd}
    ` as any[];
    
    console.log(`\n✅ Resultado: ${result2[0].total} clases\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickFix();

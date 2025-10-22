import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDates() {
  try {
    // Ver primeros 5 TimeSlots
    const samples = await prisma.timeSlot.findMany({
      take: 5,
      orderBy: { start: 'asc' },
      select: {
        id: true,
        start: true,
        end: true,
        courtId: true,
        clubId: true
      }
    });
    
    console.log('\n📅 Primeros 5 TimeSlots:\n');
    samples.forEach((s, i) => {
      console.log(`${i + 1}. ID: ${s.id.slice(-10)}`);
      console.log(`   start: ${s.start}`);
      console.log(`   start ISO: ${s.start.toISOString()}`);
      console.log(`   courtId: ${s.courtId}`);
      console.log(`   clubId: ${s.clubId}`);
      console.log('');
    });
    
    // Probar query SQL directamente
    console.log('🔍 Probando query SQL directo:\n');
    
    const startDate = '2025-09-30T22:00:00.000Z';
    const endDate = '2025-10-31T22:59:59.999Z';
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM TimeSlot
      WHERE start >= ${startDate}
        AND start <= ${endDate}
    ` as any[];
    
    console.log(`   Resultado con fechas del API: ${result[0].total} clases\n`);
    
    // Probar sin filtro de fechas
    const allCount = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM TimeSlot
    ` as any[];
    
    console.log(`   Total en TimeSlot: ${allCount[0].total} clases\n`);
    
    // Ver algunos registros directamente del SQL
    const rawSamples = await prisma.$queryRaw`
      SELECT id, start, end, courtId, clubId
      FROM TimeSlot
      LIMIT 5
    ` as any[];
    
    console.log('📋 Samples del SQL raw:\n');
    rawSamples.forEach((s: any, i: number) => {
      console.log(`${i + 1}. start: ${s.start}`);
      console.log(`   courtId: ${s.courtId}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();

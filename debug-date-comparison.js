const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDateComparison() {
  try {
    console.log('🔍 DEBUG DE COMPARACIÓN DE FECHAS\n');
    
    // Obtener un slot de 8:00 de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const slot8am = await prisma.timeSlot.findFirst({
      where: {
        start: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    if (slot8am) {
      console.log('📍 Primer slot encontrado:');
      console.log(`  start (raw):`, slot8am.start);
      console.log(`  start (Date):`, new Date(slot8am.start));
      console.log(`  start (ISO):`, new Date(slot8am.start).toISOString());
      console.log(`  start (Local):`, new Date(slot8am.start).toLocaleString('es-ES'));
    }
    
    // Simular lo que hace la API
    console.log('\n📡 Simulando la lógica de la API:\n');
    
    const startDate = new Date().toISOString();
    console.log(`  startDate original:`, startDate);
    
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);
    console.log(`  Después de setHours(0,0,0,0):`, adjustedStartDate);
    console.log(`  ISO:`, adjustedStartDate.toISOString());
    
    // Query SQL directo
    const startISO = adjustedStartDate.toISOString();
    console.log(`\n🔍 Ejecutando query con startISO: ${startISO}\n`);
    
    const results = await prisma.$queryRaw`
      SELECT id, start, instructorId
      FROM TimeSlot
      WHERE start >= ${startISO}
      ORDER BY start ASC
      LIMIT 5
    `;
    
    console.log(`Resultados: ${results.length} slots`);
    results.forEach((r, i) => {
      const d = new Date(r.start);
      console.log(`  ${i + 1}. ${d.toLocaleString('es-ES')} (${r.start})`);
    });
    
    // Ahora con startDate SIN setHours
    console.log(`\n🔍 Query SIN setHours (usando today.toISOString()):\n`);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();
    
    console.log(`  todayISO: ${todayISO}`);
    
    const results2 = await prisma.$queryRaw`
      SELECT id, start, instructorId
      FROM TimeSlot
      WHERE start >= ${todayISO}
      ORDER BY start ASC
      LIMIT 5
    `;
    
    console.log(`\nResultados: ${results2.length} slots`);
    results2.forEach((r, i) => {
      const d = new Date(r.start);
      console.log(`  ${i + 1}. ${d.toLocaleString('es-ES')} (${r.start})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDateComparison();

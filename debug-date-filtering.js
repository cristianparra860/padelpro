const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDateFiltering() {
  try {
    console.log('🔍 DEBUG: Filtrado de fechas\n');

    // Obtener la clase de Ana González
    const anaClass = await prisma.timeSlot.findFirst({
      where: {
        instructorId: 'cmjhhs1k30002tga4zzj2etzc'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!anaClass) {
      console.log('❌ No se encontró la clase');
      return;
    }

    console.log('✅ Clase encontrada:');
    console.log(`   ID: ${anaClass.id}`);
    console.log(`   start (timestamp): ${anaClass.start}`);
    console.log(`   end (timestamp): ${anaClass.end}`);
    
    const startDate = new Date(Number(anaClass.start));
    const endDate = new Date(Number(anaClass.end));
    
    console.log(`\n📅 Fecha almacenada:`);
    console.log(`   UTC: ${startDate.toISOString()}`);
    console.log(`   Local: ${startDate.toLocaleString('es-ES')}`);
    console.log(`   Solo fecha: ${startDate.toLocaleDateString('es-ES')}`);
    
    // Simular el filtro que usa el API
    const dateStr = '2025-12-22';
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    console.log(`\n🔍 Filtro del API para ${dateStr}:`);
    console.log(`   Start timestamp: ${startTimestamp}`);
    console.log(`   End timestamp: ${endTimestamp}`);
    console.log(`   Start UTC: ${startOfDay.toISOString()}`);
    console.log(`   End UTC: ${endOfDay.toISOString()}`);
    
    console.log(`\n❓ ¿La clase está en el rango?`);
    console.log(`   ${anaClass.start} >= ${startTimestamp}? ${Number(anaClass.start) >= startTimestamp}`);
    console.log(`   ${anaClass.start} <= ${endTimestamp}? ${Number(anaClass.start) <= endTimestamp}`);
    
    if (Number(anaClass.start) >= startTimestamp && Number(anaClass.start) <= endTimestamp) {
      console.log('\n✅ La clase DEBERÍA aparecer en el filtro');
    } else {
      console.log('\n❌ La clase NO está en el rango del filtro');
      console.log('\n💡 Problema: El filtro usa UTC (00:00 a 23:59 UTC) pero la clase está en hora local');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('Error:', error);
  }
}

debugDateFiltering();

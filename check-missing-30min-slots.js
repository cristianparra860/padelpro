const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissing30MinSlots() {
  try {
    console.log('🔍 BUSCANDO HUECOS EN PROPUESTAS 30MIN\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // Obtener todos los slots de hoy
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        start: true,
        instructorId: true,
        courtNumber: true
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`📋 Slots de hoy: ${allSlots.length}`);
    console.log(`  Propuestas (sin pista): ${allSlots.filter(s => s.courtNumber === null).length}`);
    console.log(`  Confirmadas (con pista): ${allSlots.filter(s => s.courtNumber !== null).length}\n`);
    
    // Agrupar por instructor
    const instructorIds = [...new Set(allSlots.map(s => s.instructorId))];
    
    console.log(`👥 Instructores únicos: ${instructorIds.length}\n`);
    
    // Para cada instructor, verificar intervalos de 30min
    let totalMissing = 0;
    
    for (const instructorId of instructorIds) {
      const instructorSlots = allSlots
        .filter(s => s.instructorId === instructorId)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId },
        select: { name: true }
      });
      
      console.log(`\n📍 ${instructor?.name || instructorId}:`);
      console.log(`  Slots: ${instructorSlots.length}`);
      
      // Verificar huecos (8:00-22:00 cada 30min = 28 slots por día)
      const expectedSlots = [];
      for (let hour = 8; hour < 22; hour++) {
        for (const minute of [0, 30]) {
          const time = new Date(today);
          time.setHours(hour, minute, 0, 0);
          expectedSlots.push(time.toISOString());
        }
      }
      
      const existingTimes = new Set(instructorSlots.map(s => new Date(s.start).toISOString()));
      const missing = expectedSlots.filter(t => !existingTimes.has(t));
      
      if (missing.length > 0) {
        console.log(`  ⚠️ FALTAN ${missing.length} slots:`);
        missing.slice(0, 5).forEach(t => {
          const time = new Date(t);
          console.log(`    - ${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`);
        });
        if (missing.length > 5) {
          console.log(`    ... y ${missing.length - 5} más`);
        }
        totalMissing += missing.length;
      } else {
        console.log(`  ✅ Completo (28 slots)`);
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Total slots faltantes: ${totalMissing}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissing30MinSlots();

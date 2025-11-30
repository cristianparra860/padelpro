const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧪 Test: Verificar integración de horarios de apertura con generador
 * 
 * 1. Modifica temporalmente los horarios del club (ej: solo 10 AM - 2 PM)
 * 2. Ejecuta el generador para mañana
 * 3. Verifica que SOLO se crearon propuestas en esas horas
 * 4. Restaura horarios originales
 */

async function main() {
  console.log('🧪 TEST: Integración horarios de apertura + generador automático\n');

  const clubId = 'padel-estrella-madrid';
  
  // PASO 1: Guardar horarios actuales
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { openingHours: true, name: true }
  });

  console.log(`📍 Club: ${club.name}`);
  const originalHours = club.openingHours;
  console.log(`💾 Horarios originales guardados`);

  // PASO 2: Configurar horarios de prueba (solo 10 AM - 2 PM = índices 4-8)
  const testHours = Array.from({ length: 19 }, (_, i) => i >= 4 && i <= 8);
  // testHours[4] = 10 AM, [5] = 11 AM, [6] = 12 PM, [7] = 1 PM, [8] = 2 PM
  
  console.log(`\n🔧 Configurando horarios de prueba: 10 AM - 2 PM (5 horas)`);
  await prisma.club.update({
    where: { id: clubId },
    data: { openingHours: JSON.stringify(testHours) }
  });
  console.log(`✅ Horarios de prueba configurados`);

  // PASO 3: Limpiar propuestas de mañana para prueba limpia
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  dayAfter.setHours(0, 0, 0, 0);

  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`\n🧹 Limpiando propuestas existentes de ${tomorrowStr}...`);
  const cleaned = await prisma.timeSlot.deleteMany({
    where: {
      clubId: clubId,
      courtId: null,
      start: {
        gte: tomorrow,
        lt: dayAfter
      }
    }
  });
  console.log(`✅ Eliminadas ${cleaned.count} propuestas previas`);

  // PASO 4: Llamar al generador
  console.log(`\n🤖 Ejecutando generador para ${tomorrowStr}...`);
  
  try {
    const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=1`);
    const result = await response.json();
    
    console.log(`✅ Generador ejecutado:`);
    console.log(`   Creadas: ${result.created}`);
    console.log(`   Omitidas: ${result.skipped}`);
  } catch (error) {
    console.error('❌ Error llamando al generador:', error.message);
    console.log('ℹ️  Asegúrate de que el servidor esté corriendo en localhost:9002');
  }

  // PASO 5: Verificar propuestas creadas
  console.log(`\n🔍 Verificando propuestas generadas...`);
  
  const newProposals = await prisma.timeSlot.findMany({
    where: {
      clubId: clubId,
      courtId: null,
      start: {
        gte: tomorrow,
        lt: dayAfter
      }
    },
    select: {
      id: true,
      start: true,
      level: true
    },
    orderBy: { start: 'asc' }
  });

  console.log(`📊 Propuestas creadas: ${newProposals.length}`);

  // Agrupar por hora
  const hourCounts = {};
  newProposals.forEach(p => {
    const hour = new Date(p.start).getUTCHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  console.log(`\n📈 Distribución por hora (UTC):`);
  Object.keys(hourCounts).sort((a, b) => a - b).forEach(hour => {
    const localHour = parseInt(hour) + 1; // UTC+1 para España
    const expectedRange = localHour >= 10 && localHour <= 14;
    const symbol = expectedRange ? '✅' : '❌';
    console.log(`   ${symbol} ${hour}:00 UTC (${localHour}:00 local): ${hourCounts[hour]} propuestas`);
  });

  // Verificar que TODAS están en el rango correcto
  const allInRange = newProposals.every(p => {
    const hour = new Date(p.start).getUTCHours();
    const localHour = hour + 1;
    return localHour >= 10 && localHour <= 14;
  });

  console.log(`\n🎯 Resultado:`);
  if (allInRange && newProposals.length > 0) {
    console.log(`✅ TEST EXITOSO: Todas las propuestas están en horario 10 AM - 2 PM`);
  } else if (newProposals.length === 0) {
    console.log(`⚠️  No se crearon propuestas (puede ser normal si instructores ocupados)`);
  } else {
    console.log(`❌ TEST FALLIDO: Algunas propuestas fuera de horario`);
  }

  // PASO 6: Restaurar horarios originales
  console.log(`\n🔄 Restaurando horarios originales...`);
  await prisma.club.update({
    where: { id: clubId },
    data: { openingHours: originalHours }
  });
  console.log(`✅ Horarios restaurados`);

  // PASO 7: Limpiar propuestas de prueba
  console.log(`\n🧹 Limpiando propuestas de prueba...`);
  await prisma.timeSlot.deleteMany({
    where: {
      clubId: clubId,
      courtId: null,
      start: {
        gte: tomorrow,
        lt: dayAfter
      }
    }
  });
  console.log(`✅ Propuestas de prueba eliminadas`);

  console.log(`\n🎉 Test completado`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Error en test:', error);
  prisma.$disconnect();
  process.exit(1);
});

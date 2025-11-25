/**
 * Debug: Verificar por qué no hay tarjetas después del día 21
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAfterDay21() {
  console.log('\n🔍 DEBUG: TARJETAS DESPUÉS DEL DÍA 21\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    const day21 = new Date('2025-11-21T00:00:00');
    const day22 = new Date('2025-11-22T00:00:00');
    const day30 = new Date('2025-11-30T23:59:59');

    console.log(`📅 Buscando TimeSlots entre ${day21.toLocaleDateString('es-ES')} y ${day30.toLocaleDateString('es-ES')}\n`);

    // Contar total de TimeSlots por día
    const slotsByDay = await prisma.$queryRaw`
      SELECT 
        DATE(start / 1000, 'unixepoch') as date,
        COUNT(*) as total,
        SUM(CASE WHEN courtId IS NULL THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN courtId IS NOT NULL THEN 1 ELSE 0 END) as confirmed
      FROM TimeSlot
      WHERE clubId = ${clubId}
      AND start >= ${day21.getTime()}
      AND start <= ${day30.getTime()}
      GROUP BY date
      ORDER BY date ASC
    `;

    console.log('📊 DISTRIBUCIÓN POR DÍAS:\n');
    
    if (slotsByDay.length === 0) {
      console.log('❌ NO HAY TIMESLOTS después del día 21');
      console.log('   Esto significa que el generador automático no los creó');
    } else {
      slotsByDay.forEach(day => {
        console.log(`${day.date}: ${Number(day.total)} slots (${Number(day.available)} disponibles, ${Number(day.confirmed)} confirmados)`);
      });
    }

    // Verificar el rango total de TimeSlots
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICAR RANGO COMPLETO DE TIMESLOTS:\n');

    const rangeCheck = await prisma.$queryRaw`
      SELECT 
        MIN(start) as minStart,
        MAX(start) as maxStart,
        COUNT(*) as total
      FROM TimeSlot
      WHERE clubId = ${clubId}
    `;

    if (rangeCheck.length > 0) {
      const minDate = new Date(rangeCheck[0].minStart);
      const maxDate = new Date(rangeCheck[0].maxStart);
      const total = Number(rangeCheck[0].total);

      console.log(`📅 Rango de fechas:`);
      console.log(`   Desde: ${minDate.toLocaleDateString('es-ES')} ${minDate.toLocaleTimeString('es-ES')}`);
      console.log(`   Hasta: ${maxDate.toLocaleDateString('es-ES')} ${maxDate.toLocaleTimeString('es-ES')}`);
      console.log(`   Total: ${total} TimeSlots`);

      const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
      console.log(`   Días de cobertura: ${daysDiff} días`);
    }

    // Verificar configuración del generador automático
    console.log('\n' + '='.repeat(70));
    console.log('⚙️ VERIFICAR CONFIGURACIÓN DEL GENERADOR:\n');

    console.log('El generador automático está configurado para crear clases:');
    console.log('   📅 Días adelante: 7 días (configurado en generate-cards)');
    console.log('   🕐 Última ejecución: Ver logs del cron job');
    console.log('   ⏰ Frecuencia: Diaria a las 00:00 UTC');

    console.log('\n💡 POSIBLES CAUSAS:');
    console.log('   1. El cron job no se está ejecutando correctamente');
    console.log('   2. La configuración está limitada a 7 días adelante');
    console.log('   3. El generador se ejecutó hace más de 7 días');

    // Verificar TimeSlots creados recientemente
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    const recentSlots = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt / 1000, 'unixepoch') as createdDate,
        COUNT(*) as count
      FROM TimeSlot
      WHERE clubId = ${clubId}
      AND createdAt >= ${last24h}
      GROUP BY createdDate
    `;

    console.log('\n' + '='.repeat(70));
    console.log('🆕 TIMESLOTS CREADOS EN LAS ÚLTIMAS 24 HORAS:\n');

    if (recentSlots.length === 0) {
      console.log('⚠️ NO se han creado TimeSlots en las últimas 24 horas');
      console.log('   El cron job puede no estar ejecutándose');
    } else {
      recentSlots.forEach(day => {
        console.log(`${day.createdDate}: ${Number(day.count)} slots creados`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔧 SOLUCIÓN:');
    console.log('   Ejecuta manualmente: node test-auto-generator.js');
    console.log('   O llama al endpoint: POST /api/cron/generate-cards');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAfterDay21();

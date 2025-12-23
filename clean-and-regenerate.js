const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndRegenerateClasses() {
  try {
    console.log('🧹 LIMPIANDO CLASES ANTIGUAS Y REGENERANDO CON SISTEMA CORRECTO\n');

    const now = Date.now();

    // 1. Primero eliminar bookings de propuestas futuras
    console.log('📋 Paso 1: Eliminando bookings de propuestas futuras...');
    
    const deleteBookings = await prisma.$executeRaw`
      DELETE FROM Booking
      WHERE timeSlotId IN (
        SELECT id FROM TimeSlot
        WHERE courtId IS NULL
        AND start > ${now}
      )
    `;
    
    console.log(`   ✅ Eliminados ${deleteBookings} bookings\n`);

    // 2. Luego eliminar las propuestas
    console.log('📋 Paso 2: Eliminando propuestas futuras (sin pista asignada)...');
    
    const result = await prisma.$executeRaw`
      DELETE FROM TimeSlot
      WHERE courtId IS NULL
      AND start > ${now}
    `;

    console.log(`   ✅ Eliminadas ${result} propuestas futuras\n`);

    // 3. Verificar clases confirmadas (no las tocamos)
    const confirmed = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NOT NULL
    `;

    console.log(`📊 Clases confirmadas (preservadas): ${confirmed[0].count}\n`);

    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('\n💡 Ahora ejecuta el generador de clases:');
    console.log('   Invoke-RestMethod -Uri "http://localhost:9002/api/cron/generate-cards?daysRange=7" -Method Get\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndRegenerateClasses();

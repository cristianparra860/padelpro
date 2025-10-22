// Script para asignar nivel y categoría a clases que ya tienen pista pero no tienen nivel/categoría
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLevelAndCategory() {
  try {
    console.log('🔍 Buscando clases con pista asignada pero sin nivel/categoría específicos...\n');

    // Obtener TimeSlots que tienen pista pero nivel/categoría genéricos
    const slotsNeedingFix = await prisma.$queryRaw`
      SELECT id, level, category, courtNumber FROM TimeSlot 
      WHERE courtNumber IS NOT NULL 
      AND courtNumber > 0
      AND (
        LOWER(level) = 'abierto' 
        OR LOWER(category) = 'abierta' 
        OR LOWER(category) = 'abierto'
        OR LOWER(category) = 'general'
      )
      ORDER BY start ASC
    `;

    console.log(`📊 Encontradas ${slotsNeedingFix.length} clases que necesitan actualización\n`);

    let updated = 0;
    let skipped = 0;

    for (const slot of slotsNeedingFix) {
      console.log(`\n🔍 TimeSlot: ${slot.id.substring(0, 12)}...`);
      console.log(`   Pista actual: ${slot.courtNumber}`);
      console.log(`   Nivel actual: ${slot.level}`);
      console.log(`   Categoría actual: ${slot.category}`);

      // Obtener la primera reserva de este TimeSlot para tomar su nivel
      const firstBooking = await prisma.$queryRaw`
        SELECT b.userId, b.createdAt, u.level
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        AND b.status IN ('PENDING', 'CONFIRMED')
        ORDER BY b.createdAt ASC
        LIMIT 1
      `;

      if (firstBooking && firstBooking.length > 0) {
        const booking = firstBooking[0];
        const userLevel = booking.level || 'abierto';
        const category = 'mixto'; // Por defecto mixto hasta que tengamos campo gender

        console.log(`   👤 Primer usuario nivel: ${userLevel}`);

        // Actualizar el TimeSlot
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET level = ${userLevel}, category = ${category}, updatedAt = datetime('now')
          WHERE id = ${slot.id}
        `;

        console.log(`   ✅ ACTUALIZADO - Nivel: ${userLevel}, Categoría: ${category}`);
        updated++;
      } else {
        console.log(`   ⚠️ No se encontraron reservas, se mantiene como está`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Proceso completado:`);
    console.log(`   - TimeSlots actualizados: ${updated}`);
    console.log(`   - TimeSlots omitidos: ${skipped}`);
    console.log(`   - Total revisados: ${slotsNeedingFix.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Iniciando corrección de nivel y categoría...\n');
fixLevelAndCategory();

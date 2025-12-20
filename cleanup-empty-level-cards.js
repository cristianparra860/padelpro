/**
 * Limpia tarjetas vacías con rangos de nivel específicos
 * Solo mantiene tarjetas "ABIERTO" sin asignar
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Limpiando tarjetas vacías con rangos de nivel específicos...\n');

  try {
    // 1. Buscar todas las tarjetas sin pista asignada (courtId IS NULL) que NO sean ABIERTO
    const emptyCards = await prisma.$queryRaw`
      SELECT id, level, category, start, instructorId
      FROM TimeSlot
      WHERE courtId IS NULL
      AND level != 'ABIERTO'
    `;

    console.log(`📊 Encontradas: ${emptyCards.length} tarjetas vacías con nivel específico\n`);

    if (emptyCards.length === 0) {
      console.log('✅ No hay tarjetas que limpiar');
      return;
    }

    // Mostrar ejemplos
    console.log('Ejemplos de tarjetas a eliminar:');
    emptyCards.slice(0, 5).forEach(card => {
      const date = new Date(Number(card.start));
      console.log(`  - ${card.id}: Nivel ${card.level}, ${date.toLocaleString()}`);
    });
    console.log('');

    // 2. Verificar si hay reservas asociadas a estas tarjetas
    const bookingsCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM Booking
      WHERE timeSlotId IN (
        SELECT id FROM TimeSlot
        WHERE courtId IS NULL
        AND level != 'ABIERTO'
      )
    `;

    console.log(`📋 Reservas asociadas: ${bookingsCount[0].count}\n`);

    if (bookingsCount[0].count > 0) {
      console.log('⚠️  Hay reservas asociadas. Eliminando primero las reservas...');
      
      // Eliminar reservas primero
      await prisma.$executeRaw`
        DELETE FROM Booking
        WHERE timeSlotId IN (
          SELECT id FROM TimeSlot
          WHERE courtId IS NULL
          AND level != 'ABIERTO'
        )
      `;
      
      console.log(`✅ Reservas eliminadas\n`);
    }

    // 3. Eliminar las tarjetas vacías con nivel específico
    const result = await prisma.$executeRaw`
      DELETE FROM TimeSlot
      WHERE courtId IS NULL
      AND level != 'ABIERTO'
    `;

    console.log(`✅ Eliminadas ${result} tarjetas vacías con nivel específico\n`);

    // 4. Verificar cuántas tarjetas ABIERTO quedan
    const abiertoCards = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE courtId IS NULL
      AND level = 'ABIERTO'
    `;

    console.log(`📋 Tarjetas ABIERTO restantes: ${abiertoCards[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearBookings() {
  try {
    console.log('🗑️  Cancelando todas las reservas de Alex García...\n');

    // Obtener todas las reservas activas
    const bookings = await prisma.$queryRaw`
      SELECT id, timeSlotId, groupSize, status, createdAt
      FROM Booking
      WHERE userId = 'cmge3nlkv0001tg30p0pw8hdm'
      AND status IN ('PENDING', 'CONFIRMED')
    `;

    console.log(`📊 Total de reservas a cancelar: ${bookings.length}\n`);

    if (bookings.length === 0) {
      console.log('✅ No hay reservas que cancelar');
      return;
    }

    // Cancelar todas las reservas (cambiar estado a CANCELLED)
    const result = await prisma.$executeRaw`
      UPDATE Booking
      SET status = 'CANCELLED', updatedAt = datetime('now')
      WHERE userId = 'cmge3nlkv0001tg30p0pw8hdm'
      AND status IN ('PENDING', 'CONFIRMED')
    `;

    console.log(`✅ ${result} reservas canceladas exitosamente\n`);

    // Verificar que no quedan reservas activas
    const remaining = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM Booking
      WHERE userId = 'cmge3nlkv0001tg30p0pw8hdm'
      AND status IN ('PENDING', 'CONFIRMED')
    `;

    const remainingCount = remaining[0].count;
    
    if (remainingCount === 0) {
      console.log('✅ Todas las reservas han sido canceladas correctamente');
      console.log('🎯 Alex García puede hacer nuevas reservas desde cero');
    } else {
      console.log(`⚠️  Aún quedan ${remainingCount} reservas activas`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearBookings();

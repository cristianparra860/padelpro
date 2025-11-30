const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllBookings() {
  try {
    console.log('🧹 Eliminando TODAS las reservas...\n');

    const count = await prisma.booking.count();
    console.log(`📊 Total de reservas: ${count}\n`);

    if (count === 0) {
      console.log('✅ No hay reservas para eliminar');
      await prisma.$disconnect();
      return;
    }

    const result = await prisma.booking.deleteMany({});
    console.log(`✅ ${result.count} reservas eliminadas\n`);

    const remaining = await prisma.booking.count();
    console.log(`📊 Reservas restantes: ${remaining}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

deleteAllBookings();

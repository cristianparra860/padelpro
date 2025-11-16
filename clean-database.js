const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndRegenerateSlots() {
  try {
    console.log('🧹 Limpiando TimeSlots corruptos...\n');

    // 1. Eliminar TODOS los Bookings PRIMERO (foreign key constraint)
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`✅ Eliminados: ${deletedBookings.count} Bookings`);

    // 2. Eliminar TODOS los TimeSlots (propuestas y confirmadas)
    const deleted = await prisma.timeSlot.deleteMany({});
    console.log(`✅ Eliminados: ${deleted.count} TimeSlots`);

    console.log('\n✅ Base de datos limpiada');
    console.log('\n📝 Ahora ejecuta el generador automático para crear nuevas propuestas:');
    console.log('   GET http://localhost:9002/api/cron/generate-cards?days=30');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndRegenerateSlots();

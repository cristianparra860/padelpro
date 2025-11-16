const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSchedules() {
  try {
    console.log('🧹 Limpiando calendarios de ocupación...\n');

    // Eliminar InstructorSchedule con raw SQL
    await prisma.$executeRaw`DELETE FROM InstructorSchedule`;
    console.log(`✅ Tabla InstructorSchedule limpiada`);

    // Eliminar CourtSchedule con raw SQL
    await prisma.$executeRaw`DELETE FROM CourtSchedule`;
    console.log(`✅ Tabla CourtSchedule limpiada`);

    console.log('\n✅ Calendarios limpiados correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSchedules();

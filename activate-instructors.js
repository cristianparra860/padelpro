const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAllInstructors() {
  try {
    console.log('🔄 Activando todos los instructores...\n');

    const result = await prisma.instructor.updateMany({
      where: { clubId: 'padel-estrella-madrid' },
      data: { isActive: true }
    });

    console.log(`✅ ${result.count} instructores activados\n`);

    // Verificar
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'padel-estrella-madrid' }
    });

    console.log('📋 Estado de instructores:\n');
    instructors.forEach(i => {
      console.log(`   ${i.isActive ? '✅' : '❌'} ${i.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAllInstructors();

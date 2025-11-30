const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'padel-estrella-madrid' }
    });

    console.log('\n📋 Estado actual de instructores:\n');
    instructors.forEach(i => {
      console.log(`   ${i.isActive ? '✅' : '❌'} ${i.name} - isActive: ${i.isActive}`);
    });
    console.log(`\n✅ Total activos: ${instructors.filter(i => i.isActive).length}`);
    console.log(`❌ Total inactivos: ${instructors.filter(i => !i.isActive).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

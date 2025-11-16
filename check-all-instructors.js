const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllInstructors() {
  try {
    console.log('🔍 Verificando todos los instructores...\n');

    const instructors = await prisma.instructor.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`📊 Total instructores: ${instructors.length}\n`);

    instructors.forEach(i => {
      console.log(`👤 ${i.name}`);
      console.log(`   ID: ${i.id}`);
      console.log(`   ClubId: ${i.clubId}`);
      console.log(`   Activo: ${i.isActive ? '✅' : '❌'}`);
      console.log(`   Email: ${i.user?.email || 'N/A'}`);
      console.log('');
    });

    // Contar propuestas por instructor
    console.log('\n📋 Propuestas por instructor:');
    for (const i of instructors) {
      const count = await prisma.timeSlot.count({
        where: {
          instructorId: i.id,
          courtId: null
        }
      });
      console.log(`   ${i.name}: ${count} propuestas`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllInstructors();

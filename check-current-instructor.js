const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentInstructor() {
  try {
    console.log('🔍 Verificando instructores y usuarios relacionados...\n');

    // Buscar todos los instructores
    const instructors = await prisma.instructor.findMany({
      include: {
        user: true
      }
    });

    console.log(`📊 Total instructores: ${instructors.length}\n`);

    for (const instructor of instructors) {
      console.log(`👤 ${instructor.name}`);
      console.log(`   Instructor ID: ${instructor.id}`);
      console.log(`   User ID: ${instructor.userId}`);
      console.log(`   Email: ${instructor.user?.email || 'N/A'}`);
      console.log(`   Activo: ${instructor.isActive ? '✅' : '❌'}`);
      
      // Verificar clases de hoy para este instructor
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayClasses = await prisma.timeSlot.count({
        where: {
          instructorId: instructor.id,
          start: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      console.log(`   Clases HOY: ${todayClasses}`);
      console.log('');
    }

    // Verificar el email específico que podría estar logueado
    console.log('\n🔍 Buscando usuario con email instructor@gmail.com...');
    const user = await prisma.user.findUnique({
      where: { email: 'instructor@gmail.com' }
    });

    if (user) {
      console.log(`✅ Usuario encontrado:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.name}`);
      console.log(`   Role: ${user.role}`);

      const instructor = await prisma.instructor.findFirst({
        where: { userId: user.id }
      });

      if (instructor) {
        console.log(`\n✅ Instructor asociado:`);
        console.log(`   ID: ${instructor.id}`);
        console.log(`   Nombre: ${instructor.name}`);

        const classes = await prisma.timeSlot.count({
          where: { instructorId: instructor.id }
        });
        console.log(`   Total clases: ${classes}`);
      } else {
        console.log(`\n❌ No hay instructor asociado a este usuario`);
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentInstructor();

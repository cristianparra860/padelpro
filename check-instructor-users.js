const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorUsers() {
  try {
    console.log('👨‍🏫 Verificando usuarios con rol INSTRUCTOR...\n');
    
    const instructorUsers = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (instructorUsers.length === 0) {
      console.log('❌ No hay usuarios con rol INSTRUCTOR');
    } else {
      console.log(`✅ Encontrados ${instructorUsers.length} usuarios con rol INSTRUCTOR:\n`);
      instructorUsers.forEach(user => {
        console.log(`  📧 ${user.email}`);
        console.log(`  👤 ${user.name}`);
        console.log(`  🆔 ${user.id}`);
        console.log('');
      });
    }

    // Verificar si tienen registro en tabla Instructor
    console.log('🔍 Verificando registros en tabla Instructor...\n');
    for (const user of instructorUsers) {
      const instructorRecord = await prisma.instructor.findFirst({
        where: {
          userId: user.id
        }
      });
      
      if (instructorRecord) {
        console.log(`  ✅ ${user.email} tiene registro Instructor (ID: ${instructorRecord.id})`);
      } else {
        console.log(`  ❌ ${user.email} NO tiene registro Instructor`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorUsers();

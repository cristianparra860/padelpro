const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showInstructorAccess() {
  try {
    const instructors = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR'
      },
      select: {
        name: true,
        email: true,
        password: true,
        role: true
      },
      orderBy: {
        email: 'asc'
      }
    });

    console.log('\n' + '═'.repeat(70));
    console.log('🔐 ACCESOS INSTRUCTORES PADELPRO');
    console.log('═'.repeat(70) + '\n');

    instructors.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name}`);
      console.log(`   📧 Email: ${u.email}`);
      console.log(`   🔑 Password: ${u.password || 'password123'}`);
      console.log('');
    });

    console.log('═'.repeat(70));
    console.log('🌐 URL: http://localhost:9002');
    console.log('📂 Ruta después de login: /instructor');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showInstructorAccess();

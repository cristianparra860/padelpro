const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCristianCredentials() {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { id: 'instructor-cristian-parra' },
      include: { user: true }
    });

    if (instructor) {
      console.log('\n✅ CREDENCIALES DE CRISTIAN PARRA:\n');
      console.log('📧 Email:', instructor.user.email);
      console.log('🔑 Contraseña: 12345678');
      console.log('\n🌐 URL de acceso: http://localhost:9002/instructor');
    } else {
      console.log('❌ No se encontró el instructor Cristian Parra');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCristianCredentials();

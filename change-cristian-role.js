const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function changeRole() {
  try {
    // Cambiar el rol del usuario Cristian Parra a INSTRUCTOR
    const updated = await prisma.user.update({
      where: { email: 'cristian.parra@padelpro.com' },
      data: { role: 'INSTRUCTOR' }
    });

    console.log('✅ Rol actualizado correctamente');
    console.log('\n📋 DATOS ACTUALIZADOS:');
    console.log('Nombre:', updated.name);
    console.log('Email:', updated.email);
    console.log('Rol:', updated.role);
    console.log('\n🎯 CREDENCIALES DE ACCESO:');
    console.log('📧 Email: cristian.parra@padelpro.com');
    console.log('🔑 Contraseña: 12345678');
    console.log('🌐 URL: http://localhost:9002/instructor');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

changeRole();

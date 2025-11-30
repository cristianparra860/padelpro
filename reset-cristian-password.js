const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  try {
    // Buscar el usuario de Cristian Parra
    const user = await prisma.user.findUnique({
      where: { email: 'cristian.parra@padelpro.com' }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Usuario encontrado:', user.email);
    console.log('📝 Nombre:', user.name);
    console.log('🎭 Role:', user.role);

    // Generar nuevo hash para la contraseña 12345678
    const newPassword = '12345678';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('\n✅ Contraseña actualizada correctamente');
    console.log('\n📋 CREDENCIALES:');
    console.log('📧 Email: cristian.parra@padelpro.com');
    console.log('🔑 Contraseña: 12345678');
    console.log('🌐 URL: http://localhost:9002/instructor');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

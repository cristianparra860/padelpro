const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setPasswordsForAll() {
  try {
    const password = 'Pass123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔐 Configurando contraseñas para todos los usuarios...\n');

    // Actualizar contraseñas de todos los usuarios
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`✅ ${user.name} (${user.email}) - Contraseña configurada`);
    }

    console.log(`\n✅ Total: ${users.length} usuarios actualizados`);
    console.log('\n🎉 ¡Todas las contraseñas han sido configuradas a: Pass123!');
    console.log('\nℹ️  Nota: Los admins usan un sistema de autenticación diferente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPasswordsForAll();

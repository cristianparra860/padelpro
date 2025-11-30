const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAllPasswords() {
  try {
    const password = '12345678';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar todos los usuarios
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'jugador1@padelpro.com',
            'jugador2@padelpro.com',
            'cristian.parra@padelpro.com',
            'instructor@padelpro.com'
          ]
        }
      }
    });

    console.log('🔄 Actualizando contraseñas...\n');

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`✅ ${user.email} → contraseña: 12345678`);
    }

    console.log('\n✅ TODAS LAS CONTRASEÑAS ACTUALIZADAS\n');
    console.log('📋 Puedes entrar con cualquiera de estos usuarios:');
    console.log('   - jugador1@padelpro.com / 12345678 (Marc Parra)');
    console.log('   - jugador2@padelpro.com / 12345678');
    console.log('   - cristian.parra@padelpro.com / 12345678 (Instructor)');
    console.log('   - instructor@padelpro.com / 12345678 (Carlos Ruiz)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllPasswords();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const newPassword = 'padelpro123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email: 'jugador2@padelpro.com' },
      data: { password: hashedPassword }
    });
    
    console.log('\n✅ Contraseña actualizada exitosamente');
    console.log('\n📧 Email: jugador2@padelpro.com');
    console.log('🔑 Nueva contraseña: padelpro123');
    console.log('\nYa puedes iniciar sesión con estas credenciales.\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

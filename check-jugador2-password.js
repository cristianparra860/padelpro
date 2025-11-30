const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkPassword() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'jugador2@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('\n📧 Usuario:', user.email);
    console.log('👤 Nombre:', user.name);
    console.log('🔑 Hash guardado:', user.password.substring(0, 30) + '...');
    console.log('\n🧪 Probando contraseñas...\n');
    
    // Probar varias contraseñas posibles
    const passwords = ['padelpro123', 'password123', '123456', 'jugador2'];
    
    for (const pwd of passwords) {
      const isValid = await bcrypt.compare(pwd, user.password);
      console.log(`   ${pwd.padEnd(15)} → ${isValid ? '✅ CORRECTA' : '❌ incorrecta'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPassword();

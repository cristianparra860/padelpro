const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAndFixPassword() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'cristian.parra@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user.name);
    console.log('🔑 Password hash:', user.password?.substring(0, 30) + '...');
    
    // Verificar si la contraseña actual funciona
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    if (isValid) {
      console.log('✅ Contraseña "password123" es válida');
    } else {
      console.log('❌ Contraseña "password123" NO es válida');
      console.log('🔧 Actualizando contraseña...');
      
      const newHash = await bcrypt.hash(testPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      });
      
      console.log('✅ Contraseña actualizada a "password123"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixPassword();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setPassword() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'cristian.parra@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user.name);
    console.log('🔑 Tiene contraseña:', !!user.password);
    
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Contraseña establecida: "password123"');
    console.log('📧 Email:', user.email);
    console.log('');
    console.log('Ahora puedes hacer login en http://localhost:9002');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setPassword();

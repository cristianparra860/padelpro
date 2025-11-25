// Crear contraseña para Alex García
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPasswordToAlex() {
  try {
    console.log('\n🔐 CREANDO CONTRASEÑA PARA ALEX GARCÍA\n');
    
    // Hash de la contraseña "Pass123!"
    const hashedPassword = await bcrypt.hash('Pass123!', 10);
    
    // Actualizar usuario Alex García
    const updated = await prisma.user.update({
      where: { email: 'alex@example.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Contraseña creada para:', updated.name);
    console.log('   Email:', updated.email);
    console.log('   ID:', updated.id);
    console.log('\n📝 CREDENCIALES DE ALEX GARCÍA:');
    console.log('   Email: alex@example.com');
    console.log('   Password: Pass123!');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPasswordToAlex();

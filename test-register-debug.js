// Test register endpoint debug
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmail() {
  try {
    console.log('🔍 Buscando email: marc.parra@hotmail.es');
    
    const user = await prisma.user.findUnique({
      where: { email: 'marc.parra@hotmail.es' }
    });
    
    if (user) {
      console.log('❌ Usuario ya existe:');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Created:', user.createdAt);
    } else {
      console.log('✅ Email disponible - NO existe usuario');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEmail();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findFirst({ 
      where: { email: 'alex.garcia@padelpro.com' } 
    });
    
    console.log('\n=== Alex García ===');
    console.log('ID:', user?.id);
    console.log('Name:', user?.name);
    console.log('Email:', user?.email);
    console.log('Gender:', user?.gender);
    console.log('GenderCategory:', user?.genderCategory);
    console.log('Level:', user?.level);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Intentando actualizar Alex García...');
    
    const updatedUser = await prisma.user.update({
      where: { email: 'alex.garcia@padelpro.com' },
      data: {
        gender: 'masculino',
        genderCategory: 'masculino'
      }
    });
    
    console.log('✅ Usuario actualizado:');
    console.log('  Gender:', updatedUser.gender);
    console.log('  GenderCategory:', updatedUser.genderCategory);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

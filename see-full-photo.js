const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seeFullPhoto() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('📸 Foto COMPLETA de Juan Pérez:');
    console.log('='.repeat(80));
    console.log(user.profilePictureUrl);
    console.log('='.repeat(80));
    console.log(`\n📊 Longitud: ${user.profilePictureUrl?.length} caracteres`);
    console.log(`✅ Es data URI: ${user.profilePictureUrl?.startsWith('data:image')}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seeFullPhoto();

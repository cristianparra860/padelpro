const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPhotos() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        profilePictureUrl: true
      },
      take: 10
    });
    
    console.log('👤 Primeros 10 usuarios:');
    users.forEach(u => {
      if (u.profilePictureUrl) {
        console.log(`  ✅ ${u.name}: ${u.profilePictureUrl.substring(0, 50)}`);
      } else {
        console.log(`  ❌ ${u.name}: Sin foto de perfil`);
      }
    });
    
    const withPhoto = users.filter(u => u.profilePictureUrl).length;
    const withoutPhoto = users.filter(u => !u.profilePictureUrl).length;
    
    console.log(`\n📊 Resumen: ${withPhoto} con foto, ${withoutPhoto} sin foto`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPhotos();
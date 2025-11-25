const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProfilePictures() {
  try {
    console.log('🔍 Verificando fotos de perfil en la base de datos...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true
      }
    });

    console.log(`📊 Total usuarios: ${users.length}\n`);

    users.forEach(user => {
      const hasPhoto = !!user.profilePictureUrl;
      const photoSize = user.profilePictureUrl 
        ? Math.round(user.profilePictureUrl.length / 1024) 
        : 0;
      
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Foto: ${hasPhoto ? '✅ SÍ' : '❌ NO'}`);
      if (hasPhoto) {
        console.log(`   Tamaño: ${photoSize} KB`);
        console.log(`   Primeros caracteres: ${user.profilePictureUrl?.substring(0, 50)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfilePictures();

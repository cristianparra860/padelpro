const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRealPhoto() {
  try {
    // JPEG 1x1 pixel rojo válido en base64
    const realJpegPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
    
    await prisma.user.update({
      where: { email: 'jugador1@padelpro.com' },
      data: {
        profilePictureUrl: realJpegPhoto
      }
    });
    
    console.log('✅ Foto JPEG real actualizada');
    console.log('📊 Tamaño:', realJpegPhoto.length, 'caracteres');
    console.log('🎨 Tipo: JPEG 1x1 pixel rojo (para testing)');
    
    // Verificar
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('\n✅ Verificación:');
    console.log('   Tiene foto:', !!user.profilePictureUrl);
    console.log('   Es data:image:', user.profilePictureUrl?.startsWith('data:image'));
    console.log('   Es JPEG:', user.profilePictureUrl?.startsWith('data:image/jpeg'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRealPhoto();

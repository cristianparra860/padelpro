const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear una imagen de prueba más grande (círculo azul de 200x200)
const testImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="90" fill="#007acc"/>
  <text x="100" y="120" font-family="Arial" font-size="80" fill="white" text-anchor="middle">CP</text>
</svg>
`).toString('base64')}`;

async function setTestImage() {
  try {
    console.log('🖼️ Estableciendo imagen de prueba más grande...\n');
    
    const user = await prisma.user.findFirst({
      where: { email: 'cristian.parra@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user.name);
    console.log('📊 Imagen de prueba: SVG círculo azul con "CP"');
    console.log('   Tamaño:', Math.round(testImage.length / 1024), 'KB');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureUrl: testImage }
    });
    
    console.log('✅ Imagen actualizada en base de datos');
    console.log('\n🌐 Ahora recarga: http://localhost:9002/profile');
    console.log('   Deberías ver un círculo azul con "CP" en blanco');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setTestImage();

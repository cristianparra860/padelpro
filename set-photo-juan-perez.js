const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Imagen SVG para Juan Pérez
const jpImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="95" fill="url(#grad)"/>
  <text x="100" y="130" font-family="Arial" font-size="90" font-weight="bold" fill="white" text-anchor="middle">JP</text>
</svg>
`).toString('base64')}`;

async function setPhotoForJuanPerez() {
  try {
    console.log('🖼️ ESTABLECIENDO FOTO PARA JUAN PÉREZ\n');
    
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario Juan Pérez no encontrado');
      return;
    }
    
    console.log('👤 Usuario encontrado:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🎨 Imagen: SVG con gradiente morado con "JP"');
    console.log('📊 Tamaño:', Math.round(jpImage.length / 1024), 'KB');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureUrl: jpImage }
    });
    
    console.log('\n✅ Foto actualizada en base de datos');
    console.log('\n🌐 Ahora recarga: http://localhost:9002/profile');
    console.log('   Deberías ver un círculo con gradiente morado con "JP" en blanco');
    console.log('\n📸 También puedes subir tu propia foto haciendo clic en el ícono de cámara');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setPhotoForJuanPerez();

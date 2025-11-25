const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRealTestImage() {
  try {
    // SVG grande y visible - 200x200px con gradiente y texto
    const largeSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="98" fill="url(#grad)" stroke="white" stroke-width="4"/>
  <text x="100" y="135" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">JP</text>
</svg>`;

    // Convertir a base64
    const base64Svg = Buffer.from(largeSvg).toString('base64');
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`;
    
    console.log('🎨 Creando imagen de prueba visible...\n');
    console.log('Tipo: SVG 200x200px con gradiente');
    console.log('Tamaño:', dataUri.length, 'caracteres');
    console.log('Preview:', dataUri.substring(0, 80));
    
    await prisma.user.update({
      where: { email: 'jugador1@padelpro.com' },
      data: { profilePictureUrl: dataUri }
    });
    
    console.log('\n✅ Imagen actualizada en la base de datos');
    console.log('');
    console.log('Esta imagen es:');
    console.log('  - 200x200 pixels (visible)');
    console.log('  - Gradiente morado/azul');
    console.log('  - Texto "JP" blanco en el centro');
    console.log('');
    console.log('🔄 Recarga la página /profile ahora');
    console.log('   Deberías ver un círculo morado con "JP" blanco');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRealTestImage();

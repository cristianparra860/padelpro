const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function testImageValidity() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('📸 VERIFICANDO VALIDEZ DE LA IMAGEN\n');
    console.log('Usuario:', user.name);
    console.log('Tiene profilePictureUrl:', !!user.profilePictureUrl);
    console.log('Longitud:', user.profilePictureUrl?.length);
    console.log('\n🔍 Analizando imagen...\n');
    
    const photoUrl = user.profilePictureUrl;
    
    if (!photoUrl) {
      console.log('❌ No hay foto');
      return;
    }
    
    // Verificar formato
    console.log('1. Formato:', photoUrl.substring(0, 30));
    
    if (photoUrl.startsWith('data:image/jpeg')) {
      console.log('   ✅ Es JPEG');
      
      // Extraer base64
      const base64Data = photoUrl.split(',')[1];
      console.log('   Base64 length:', base64Data?.length);
      
      if (!base64Data) {
        console.log('   ❌ NO HAY DATOS BASE64');
        return;
      }
      
      // Intentar decodificar
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        console.log('   ✅ Se puede decodificar');
        console.log('   Tamaño del buffer:', buffer.length, 'bytes');
        
        // Guardar a archivo para verificar
        fs.writeFileSync('test-image.jpg', buffer);
        console.log('   ✅ Imagen guardada en: test-image.jpg');
        console.log('   Abre ese archivo para verificar si es válido');
        
        // Verificar si es una imagen válida (header JPEG: FF D8 FF)
        const header = buffer.slice(0, 3).toString('hex');
        console.log('   Header bytes:', header);
        if (header.startsWith('ffd8ff')) {
          console.log('   ✅ Header JPEG válido');
        } else {
          console.log('   ❌ Header JPEG inválido - La imagen está corrupta');
        }
        
      } catch (error) {
        console.log('   ❌ Error decodificando:', error.message);
      }
      
    } else if (photoUrl.startsWith('data:image/svg')) {
      console.log('   ✅ Es SVG');
      
      // Decodificar SVG
      if (photoUrl.includes('base64')) {
        const base64Data = photoUrl.split(',')[1];
        const svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        console.log('   SVG content:', svgContent);
      } else {
        // URL-encoded
        const svgContent = decodeURIComponent(photoUrl.split(',')[1]);
        console.log('   SVG content:', svgContent);
      }
      
      fs.writeFileSync('test-image.svg', photoUrl.includes('base64') 
        ? Buffer.from(photoUrl.split(',')[1], 'base64').toString('utf-8')
        : decodeURIComponent(photoUrl.split(',')[1])
      );
      console.log('   ✅ SVG guardado en: test-image.svg');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 CONCLUSIÓN:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Si el archivo test-image.jpg/svg se ve correctamente al abrirlo,');
    console.log('entonces la imagen en la BD está bien.');
    console.log('');
    console.log('Si NO se ve, la imagen está corrupta y necesita subirse de nuevo.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImageValidity();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Imagen de prueba pequeña (1x1 pixel rojo en PNG)
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testDirectUpdate() {
  try {
    console.log('🧪 Test: Actualización directa de foto en DB\n');
    
    // 1. Buscar usuario
    const user = await prisma.user.findFirst({
      where: { email: 'cristian.parra@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario encontrado:', user.name, `(${user.id})`);
    console.log('📸 Foto actual:', user.profilePictureUrl ? user.profilePictureUrl.substring(0, 50) + '...' : 'ninguna');
    console.log('');
    
    // 2. Actualizar con imagen de prueba
    console.log('📤 Actualizando con imagen de prueba...');
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureUrl: testImage }
    });
    
    console.log('✅ Actualización exitosa');
    console.log('📊 Nueva foto:');
    console.log('   Es base64:', updated.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño:', Math.round((updated.profilePictureUrl?.length || 0) / 1024), 'KB');
    console.log('   Primeros chars:', updated.profilePictureUrl?.substring(0, 50) + '...');
    console.log('');
    
    // 3. Verificar que se guardó
    console.log('🔍 Verificando en DB...');
    const verify = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, profilePictureUrl: true }
    });
    
    if (verify?.profilePictureUrl === testImage) {
      console.log('✅ ¡FOTO GUARDADA CORRECTAMENTE EN LA BASE DE DATOS!');
      console.log('');
      console.log('🌐 Ahora recarga http://localhost:9002/profile');
      console.log('   Deberías ver un cuadrado rojo como foto de perfil');
    } else {
      console.log('❌ La foto no se guardó correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectUpdate();

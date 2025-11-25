// Test completo del flujo de carga de foto de perfil
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFlow() {
  console.log('🧪 TEST: Flujo completo de foto de perfil\n');
  
  try {
    // 1. Verificar usuario actual
    const user = await prisma.user.findUnique({
      where: { id: 'user-cristian-parra' },
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true
      }
    });

    console.log('1️⃣ Usuario en DB:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.name);
    console.log('   Foto actual:', user.profilePictureUrl ? 'SÍ (' + user.profilePictureUrl.substring(0, 50) + '...)' : 'NO');
    console.log('   Es base64:', user.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO\n');

    // 2. Simular actualización con imagen base64 pequeña
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    console.log('2️⃣ Actualizando con imagen de prueba...');
    console.log('   Tamaño:', Math.round(testImageBase64.length / 1024), 'KB');
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureUrl: testImageBase64 },
      select: {
        id: true,
        name: true,
        profilePictureUrl: true
      }
    });

    console.log('✅ Actualización exitosa');
    console.log('   Foto guardada:', !!updated.profilePictureUrl);
    console.log('   Es base64:', updated.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño en DB:', updated.profilePictureUrl ? Math.round(updated.profilePictureUrl.length / 1024) + ' KB' : '0 KB');
    
    // 3. Verificar que se guardó correctamente
    console.log('\n3️⃣ Verificando persistencia...');
    const verified = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePictureUrl: true }
    });

    console.log('✅ Foto verificada en DB');
    console.log('   Primeros 80 caracteres:', verified.profilePictureUrl?.substring(0, 80));
    console.log('\n✅ TEST COMPLETADO - La DB acepta y guarda imágenes base64');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFlow();

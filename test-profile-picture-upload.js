const fs = require('fs');
const path = require('path');

// Simular una imagen pequeña en base64 (1x1 pixel rojo)
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

console.log('🧪 Test de subida de foto de perfil\n');
console.log('📊 Imagen de prueba:');
console.log('   Tamaño:', Math.round(testImageBase64.length / 1024), 'KB');
console.log('   Formato:', testImageBase64.substring(0, 30) + '...\n');

async function testUpload() {
  try {
    // 1. Login para obtener token
    console.log('1️⃣ Haciendo login...');
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cristian.parra@padelpro.com',
        password: 'password123'
      })
    });

    if (!loginRes.ok) {
      throw new Error('Login fallido');
    }

    const { token, user } = await loginRes.json();
    console.log('✅ Login exitoso');
    console.log('   Usuario:', user.name);
    console.log('   ID:', user.id);
    console.log('   Foto actual:', user.profilePictureUrl ? 'SÍ' : 'NO\n');

    // 2. Subir foto
    console.log('2️⃣ Subiendo foto de perfil...');
    const uploadRes = await fetch(`http://localhost:9002/api/users/${user.id}/profile-picture`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ profilePictureUrl: testImageBase64 })
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.json();
      throw new Error(`Upload fallido: ${error.error} - ${error.details}`);
    }

    const result = await uploadRes.json();
    console.log('✅ Foto subida exitosamente');
    console.log('   Usuario actualizado:', result.user.name);
    console.log('   Tiene foto:', !!result.user.profilePictureUrl);
    console.log('   Tamaño:', result.user.profilePictureUrl ? Math.round(result.user.profilePictureUrl.length / 1024) + ' KB' : 'N/A');

    // 3. Verificar en DB
    console.log('\n3️⃣ Verificando en base de datos...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, profilePictureUrl: true }
    });

    console.log('✅ Usuario en DB:');
    console.log('   Nombre:', dbUser.name);
    console.log('   Tiene foto:', !!dbUser.profilePictureUrl);
    console.log('   Es base64:', dbUser.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Primeros chars:', dbUser.profilePictureUrl?.substring(0, 50) + '...');

    await prisma.$disconnect();

    console.log('\n✅ ¡Test completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUpload();

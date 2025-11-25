const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';

async function testPhotoUpload() {
  try {
    console.log('🧪 PROBANDO SUBIDA DE FOTO COMPLETA\n');
    
    // 1. Obtener usuario
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('1️⃣ Usuario:', user.name, user.id);
    
    // 2. Generar token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        clubId: user.clubId || ''
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('2️⃣ Token generado:', token.substring(0, 50) + '...');
    
    // 3. Crear imagen de prueba (PNG 1x1 rojo en base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testImageDataUrl = `data:image/png;base64,${testImageBase64}`;
    
    console.log('3️⃣ Imagen de prueba creada:', testImageDataUrl.substring(0, 80));
    console.log('   Tamaño:', testImageDataUrl.length, 'caracteres');
    
    // 4. Llamar al API
    console.log('\n4️⃣ Llamando al API PUT /api/users/' + user.id + '/profile-picture');
    
    const response = await fetch(`http://localhost:9002/api/users/${user.id}/profile-picture`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        profilePictureUrl: testImageDataUrl 
      })
    });
    
    console.log('\n5️⃣ Respuesta del servidor:');
    console.log('   Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCCESS!');
      console.log('   Usuario actualizado:', data.user?.name);
      console.log('   Tiene foto:', !!data.user?.profilePictureUrl);
      console.log('   Tamaño foto:', data.user?.profilePictureUrl?.length, 'chars');
      
      // 6. Verificar en base de datos
      console.log('\n6️⃣ Verificando en base de datos...');
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      
      console.log('   Tiene foto en DB:', !!updatedUser.profilePictureUrl);
      console.log('   Tamaño en DB:', updatedUser.profilePictureUrl?.length);
      console.log('   Coincide:', updatedUser.profilePictureUrl === testImageDataUrl ? '✅ SÍ' : '❌ NO');
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ SUBIDA DE FOTO FUNCIONA CORRECTAMENTE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Si la foto no aparece en el navegador, el problema es:');
      console.log('  - El estado del componente no se está actualizando');
      console.log('  - El componente no se está re-renderizando');
      
    } else {
      const errorText = await response.text();
      console.log('   ❌ ERROR!');
      console.log('   Response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.log('   Error:', errorData.error);
        console.log('   Details:', errorData.details);
      } catch (e) {
        console.log('   Raw error:', errorText);
      }
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('❌ EL API NO ESTÁ FUNCIONANDO');
      console.log('═══════════════════════════════════════════════════════════');
    }
    
  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPhotoUpload();

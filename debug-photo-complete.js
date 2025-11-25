const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPhotoIssue() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE FOTO DE PERFIL\n');
    console.log('='.repeat(60));
    
    // 1. Verificar en base de datos
    console.log('\n1️⃣ VERIFICANDO BASE DE DATOS...');
    const user = await prisma.user.findFirst({
      where: { email: 'cristian.parra@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario:', user.name);
    console.log('   ID:', user.id);
    console.log('   Tiene foto:', !!user.profilePictureUrl);
    console.log('   Es base64:', user.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño:', Math.round((user.profilePictureUrl?.length || 0) / 1024), 'KB');
    console.log('   Primeros 60 chars:', user.profilePictureUrl?.substring(0, 60));
    
    // 2. Probar login
    console.log('\n2️⃣ PROBANDO LOGIN...');
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cristian.parra@padelpro.com',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login fallido:', loginRes.status);
      return;
    }
    
    const loginData = await loginRes.json();
    console.log('✅ Login exitoso');
    console.log('   Token presente:', !!loginData.token);
    console.log('   Usuario devuelto:', loginData.user?.name);
    console.log('   Foto en respuesta de login:', !!loginData.user?.profilePictureUrl);
    
    // 3. Probar API /api/users/current
    console.log('\n3️⃣ PROBANDO API /api/users/current...');
    const currentRes = await fetch('http://localhost:9002/api/users/current', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (!currentRes.ok) {
      console.log('❌ Error:', currentRes.status);
      return;
    }
    
    const currentData = await currentRes.json();
    console.log('✅ API responde correctamente');
    console.log('   Usuario:', currentData.name);
    console.log('   Tiene profilePictureUrl:', !!currentData.profilePictureUrl);
    console.log('   Es base64:', currentData.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño:', Math.round((currentData.profilePictureUrl?.length || 0) / 1024), 'KB');
    console.log('   Primeros 60 chars:', currentData.profilePictureUrl?.substring(0, 60));
    
    // 4. Comparar
    console.log('\n4️⃣ COMPARACIÓN...');
    const dbPhoto = user.profilePictureUrl;
    const apiPhoto = currentData.profilePictureUrl;
    
    if (dbPhoto === apiPhoto) {
      console.log('✅ La foto en DB y API coinciden perfectamente');
    } else {
      console.log('⚠️ DIFERENCIA DETECTADA:');
      console.log('   DB length:', dbPhoto?.length || 0);
      console.log('   API length:', apiPhoto?.length || 0);
      console.log('   DB inicia:', dbPhoto?.substring(0, 40));
      console.log('   API inicia:', apiPhoto?.substring(0, 40));
    }
    
    // 5. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log('   Base de datos: ' + (!!dbPhoto ? '✅ Tiene foto base64' : '❌ No tiene foto'));
    console.log('   API response: ' + (!!apiPhoto ? '✅ Devuelve foto' : '❌ No devuelve foto'));
    console.log('   Coinciden: ' + (dbPhoto === apiPhoto ? '✅ SÍ' : '❌ NO'));
    
    if (!!dbPhoto && !!apiPhoto && dbPhoto === apiPhoto) {
      console.log('\n🎯 DIAGNÓSTICO:');
      console.log('   Backend funciona correctamente ✅');
      console.log('   El problema está en el FRONTEND');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   1. Abre http://localhost:9002/profile');
      console.log('   2. Abre consola del navegador (F12)');
      console.log('   3. Busca el log: "🖼️ UserProfileAvatar render"');
      console.log('   4. Verifica que profilePicUrl tenga datos');
      console.log('   5. Si no aparece, el hook useUserProfile no está recibiendo el usuario correctamente');
    } else if (!dbPhoto) {
      console.log('\n🎯 DIAGNÓSTICO:');
      console.log('   La foto NO está en la base de datos');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   Ejecuta: node test-direct-photo-update.js');
    } else {
      console.log('\n🎯 DIAGNÓSTICO:');
      console.log('   La API no está devolviendo la foto correctamente');
      console.log('\n💡 VERIFICA:');
      console.log('   - El código en src/app/api/users/current/route.ts');
      console.log('   - Que incluya: profilePictureUrl: user.profilePictureUrl');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugPhotoIssue();

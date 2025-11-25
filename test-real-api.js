const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'padelpro-secret-key-2024';

async function testRealAPI() {
  try {
    console.log('🔍 TEST FINAL - Verificando API real\n');
    
    // 1. Verificar DB
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('1️⃣ BASE DE DATOS:');
    console.log('   Name:', user.name);
    console.log('   profilePictureUrl:', user.profilePictureUrl ? '✅ SÍ' : '❌ NO');
    console.log('   Longitud:', user.profilePictureUrl?.length);
    console.log('   Preview:', user.profilePictureUrl?.substring(0, 50));
    
    // 2. Generar token válido
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('\n2️⃣ TOKEN JWT:');
    console.log('   ✅ Generado correctamente');
    console.log('   Preview:', token.substring(0, 50) + '...');
    
    // 3. Llamar al API real
    console.log('\n3️⃣ LLAMANDO AL API /api/users/current:');
    
    try {
      const response = await fetch('http://localhost:9002/api/users/current', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('\n4️⃣ RESPUESTA DEL API:');
        console.log('   Name:', data.name);
        console.log('   Email:', data.email);
        console.log('   profilePictureUrl:', data.profilePictureUrl ? '✅ PRESENTE' : '❌ FALTA');
        console.log('   Longitud:', data.profilePictureUrl?.length);
        console.log('   Preview:', data.profilePictureUrl?.substring(0, 50));
        console.log('   Es válido:', data.profilePictureUrl?.startsWith('data:image') ? '✅ SÍ' : '❌ NO');
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🎯 RESULTADO:');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (data.profilePictureUrl && data.profilePictureUrl.startsWith('data:image')) {
          console.log('✅ EL API FUNCIONA PERFECTAMENTE');
          console.log('✅ Devuelve profilePictureUrl correctamente');
          console.log('');
          console.log('❌ EL PROBLEMA ESTÁ 100% EN EL FRONTEND');
          console.log('   El componente React no está recibiendo/renderizando la foto');
          console.log('');
          console.log('🔧 SOLUCIÓN: Revisar props del componente UserProfileAvatar');
          console.log('   user.profilePictureUrl debe tener valor pero probablemente llega undefined');
        } else {
          console.log('❌ EL API NO DEVUELVE LA FOTO CORRECTAMENTE');
        }
        
      } else {
        console.log('   ❌ Error:', response.status);
        const errorText = await response.text();
        console.log('   Mensaje:', errorText);
      }
      
    } catch (fetchError) {
      console.log('   ❌ Error en fetch:', fetchError.message);
      console.log('   ⚠️ ¿Está el servidor corriendo en puerto 9002?');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealAPI();

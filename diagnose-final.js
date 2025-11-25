const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function finalTest() {
  try {
    console.log('🔍 DIAGNÓSTICO FINAL - ¿Por qué no carga la foto?\n');
    
    // 1. Verificar base de datos
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('1️⃣ BASE DE DATOS:');
    console.log('   ✅ Usuario:', user.name);
    console.log('   ✅ Tiene foto:', !!user.profilePictureUrl);
    console.log('   ✅ Tipo:', user.profilePictureUrl?.substring(0, 20));
    console.log('   ✅ Tamaño:', user.profilePictureUrl?.length, 'chars');
    
    // 2. Verificar que sea una imagen válida
    const isValidImage = user.profilePictureUrl && 
                        user.profilePictureUrl.startsWith('data:image');
    
    console.log('\n2️⃣ VALIDACIÓN:');
    console.log('   ✅ Es data URI:', isValidImage);
    console.log('   ✅ Formato:', user.profilePictureUrl?.match(/data:image\/(\w+)/)?.[1]);
    
    // 3. Simular el componente
    console.log('\n3️⃣ SIMULACIÓN DEL COMPONENTE UserProfileAvatar:');
    console.log('   Props recibidos:');
    console.log('     - user.profilePictureUrl:', user.profilePictureUrl?.substring(0, 40));
    console.log('     - user.name:', user.name);
    
    const photoUrl = user.profilePictureUrl;
    const hasPhoto = photoUrl && photoUrl.startsWith('data:image');
    
    console.log('\n   Lógica del componente:');
    console.log('     - photoUrl:', photoUrl?.substring(0, 40));
    console.log('     - hasPhoto:', hasPhoto);
    console.log('     - Debería renderizar:', hasPhoto ? 'IMAGEN ✅' : 'INICIALES ❌');
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 CONCLUSIÓN:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (hasPhoto) {
      console.log('✅ TODO ESTÁ CORRECTO en el backend');
      console.log('✅ La foto DEBERÍA mostrarse');
      console.log('');
      console.log('Si no se muestra en el navegador, el problema es:');
      console.log('');
      console.log('❌ CAUSA MÁS PROBABLE:');
      console.log('   El prop user.profilePictureUrl llega como NULL/UNDEFINED');
      console.log('   al componente aunque el API lo devuelve correctamente.');
      console.log('');
      console.log('🔧 SOLUCIÓN:');
      console.log('   1. Abre http://localhost:9002/profile');
      console.log('   2. Presiona F12');
      console.log('   3. Busca en la consola: "🖼️ Avatar render SIMPLE:"');
      console.log('   4. Mira el valor de "userProfilePictureUrl"');
      console.log('   5. Si es null/undefined, el problema está en useUserProfile');
      console.log('');
      console.log('📋 COPIAR Y PEGAR EN LA CONSOLA DEL NAVEGADOR:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('fetch("/api/users/current", {');
      console.log('  headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}` }');
      console.log('}).then(r => r.json()).then(d => console.log("profilePictureUrl:", d.profilePictureUrl?.substring(0,50)))');
      console.log('═══════════════════════════════════════════════════════════');
    } else {
      console.log('❌ NO hay foto en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalTest();

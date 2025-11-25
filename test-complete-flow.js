const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testCompleteFlow() {
  try {
    console.log('🧪 SIMULANDO FLUJO COMPLETO DEL NAVEGADOR\n');
    
    // 1. Usuario en base de datos
    console.log('1️⃣ PASO 1: Leer usuario de base de datos');
    const dbUser = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('✅ Usuario en DB:', {
      name: dbUser.name,
      hasPhoto: !!dbUser.profilePictureUrl,
      photoType: dbUser.profilePictureUrl?.substring(0, 20),
      photoLength: dbUser.profilePictureUrl?.length
    });
    
    // 2. Simular respuesta del API /api/users/current
    console.log('\n2️⃣ PASO 2: Simular respuesta de /api/users/current');
    const apiResponse = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber,
      emergencyContact: dbUser.emergencyContact,
      genderCategory: dbUser.genderCategory,
      level: dbUser.level,
      role: dbUser.role,
      credits: Number(dbUser.credits),
      profilePictureUrl: dbUser.profilePictureUrl
    };
    
    console.log('✅ API devuelve:', {
      name: apiResponse.name,
      hasProfilePictureUrl: !!apiResponse.profilePictureUrl,
      startsWithDataImage: apiResponse.profilePictureUrl?.startsWith('data:image'),
      photoLength: apiResponse.profilePictureUrl?.length
    });
    
    // 3. Simular lo que recibe el componente
    console.log('\n3️⃣ PASO 3: Simular UserProfileAvatar props');
    const componentProps = {
      user: apiResponse,
      profilePicUrl: apiResponse.profilePictureUrl
    };
    
    console.log('✅ Props del componente:', {
      'user.name': componentProps.user.name,
      'user.profilePictureUrl': componentProps.user.profilePictureUrl?.substring(0, 40),
      'profilePicUrl': componentProps.profilePicUrl?.substring(0, 40)
    });
    
    // 4. Simular lógica del componente simplificado
    console.log('\n4️⃣ PASO 4: Lógica del componente');
    const photoUrl = componentProps.user.profilePictureUrl || componentProps.profilePicUrl;
    const hasPhoto = photoUrl && photoUrl.startsWith('data:image');
    
    console.log('✅ Resultado de la lógica:', {
      photoUrl: photoUrl?.substring(0, 40),
      hasPhoto,
      shouldRenderImage: hasPhoto,
      shouldRenderInitials: !hasPhoto
    });
    
    // 5. Verificar que la imagen es válida
    console.log('\n5️⃣ PASO 5: Validar imagen');
    if (hasPhoto) {
      console.log('✅ IMAGEN VÁLIDA - El componente DEBERÍA mostrar la foto');
      console.log('📸 Data URI completo (primeros 100 chars):');
      console.log(photoUrl.substring(0, 100) + '...');
      
      // Verificar formato
      if (photoUrl.startsWith('data:image/jpeg')) {
        console.log('✅ Formato: JPEG');
      } else if (photoUrl.startsWith('data:image/svg')) {
        console.log('✅ Formato: SVG');
      } else if (photoUrl.startsWith('data:image/png')) {
        console.log('✅ Formato: PNG');
      }
    } else {
      console.log('❌ NO HAY IMAGEN - El componente mostrará iniciales');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 DIAGNÓSTICO FINAL:');
    console.log('='.repeat(80));
    
    if (hasPhoto) {
      console.log('✅ TODO CORRECTO - La foto DEBERÍA mostrarse');
      console.log('');
      console.log('Si no se muestra en el navegador, el problema es:');
      console.log('  1. El componente no se está re-renderizando');
      console.log('  2. El prop user.profilePictureUrl está llegando como undefined/null');
      console.log('  3. Hay un problema con el hook useUserProfile');
      console.log('');
      console.log('SOLUCIÓN: Abre el navegador y mira la consola, debería mostrar:');
      console.log('  "🖼️ Avatar render SIMPLE:" con hasPhoto: true');
      console.log('  "✅ ¡¡FOTO CARGADA!!"');
    } else {
      console.log('❌ PROBLEMA ENCONTRADO - No hay foto válida en los datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();

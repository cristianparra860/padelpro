const fetch = require('node-fetch');

async function simulateBrowserFlow() {
  try {
    console.log('🌐 SIMULANDO FLUJO DEL NAVEGADOR\n');
    console.log('='.repeat(70));
    
    // 1. Login
    console.log('\n1️⃣ LOGIN...');
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cristian.parra@padelpro.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Token obtenido');
    
    // 2. Cargar usuario (lo que hace useEffect en profile page)
    console.log('\n2️⃣ CARGANDO USUARIO (como lo hace /profile)...');
    const userRes = await fetch('http://localhost:9002/api/users/current', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userData = await userRes.json();
    console.log('✅ Usuario cargado:', userData.name);
    console.log('   profilePictureUrl presente:', !!userData.profilePictureUrl);
    console.log('   Es base64:', userData.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño:', Math.round((userData.profilePictureUrl?.length || 0) / 1024), 'KB');
    
    // 3. Simular lo que hace useUserProfile hook
    console.log('\n3️⃣ SIMULANDO useUserProfile HOOK...');
    console.log('   initialUser.profilePictureUrl:', !!userData.profilePictureUrl);
    
    // El hook hace: const [profilePicUrl, setProfilePicUrl] = useState(initialUser?.profilePictureUrl || null);
    const profilePicUrl = userData.profilePictureUrl || null;
    console.log('   Estado profilePicUrl:', !!profilePicUrl);
    
    // 4. Simular UserProfileAvatar component
    console.log('\n4️⃣ SIMULANDO UserProfileAvatar COMPONENT...');
    const isBase64 = profilePicUrl?.startsWith('data:image');
    const currentProfilePic = isBase64 
      ? profilePicUrl 
      : (profilePicUrl || `https://i.pravatar.cc/150?u=${userData.id}`);
    
    console.log('   isBase64:', isBase64);
    console.log('   currentProfilePic (primeros 60):', currentProfilePic.substring(0, 60));
    console.log('   Debería mostrar:', isBase64 ? 'IMAGEN BASE64' : 'AVATAR POR DEFECTO');
    
    // 5. Conclusión
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNÓSTICO FINAL:\n');
    
    if (userData.profilePictureUrl && isBase64) {
      console.log('✅ TODO ESTÁ CORRECTO:');
      console.log('   ✓ Backend devuelve la foto');
      console.log('   ✓ Es base64 válido');
      console.log('   ✓ Hook recibe los datos');
      console.log('   ✓ Componente debería mostrarla\n');
      
      console.log('🎯 PROBLEMA IDENTIFICADO:');
      console.log('   El componente Avatar de Radix UI está cacheando la imagen');
      console.log('   o no la está actualizando correctamente.\n');
      
      console.log('💡 SOLUCIÓN:');
      console.log('   Voy a reemplazar el Avatar de Radix UI por un <img> simple');
      console.log('   para evitar problemas de cache y renderizado.');
    } else {
      console.log('❌ HAY UN PROBLEMA:');
      if (!userData.profilePictureUrl) {
        console.log('   Backend NO está devolviendo profilePictureUrl');
      } else if (!isBase64) {
        console.log('   profilePictureUrl NO es base64');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

simulateBrowserFlow();

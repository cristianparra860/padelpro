const fetch = require('node-fetch');

async function verifyComponentData() {
  try {
    console.log('🔍 VERIFICANDO DATOS DEL COMPONENTE\n');
    console.log('='.repeat(70));
    
    // 1. Login y obtener token
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cristian.parra@padelpro.com',
        password: 'password123'
      })
    });
    
    const { token } = await loginRes.json();
    
    // 2. Obtener usuario (lo que hace el useEffect en profile page)
    console.log('\n📡 PASO 1: useEffect carga el usuario...');
    const userRes = await fetch('http://localhost:9002/api/users/current', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const currentUser = await userRes.json();
    console.log('✅ currentUser cargado:');
    console.log('   name:', currentUser.name);
    console.log('   profilePictureUrl:', currentUser.profilePictureUrl ? 'PRESENTE' : 'AUSENTE');
    console.log('   Tamaño:', (currentUser.profilePictureUrl?.length || 0), 'caracteres');
    console.log('   Primeros 60:', currentUser.profilePictureUrl?.substring(0, 60));
    
    // 3. Simular useUserProfile hook
    console.log('\n🎣 PASO 2: useUserProfile(currentUser) inicializa...');
    const initialUser = currentUser;
    
    // En el hook: const [profilePicUrl, setProfilePicUrl] = useState(initialUser?.profilePictureUrl || null);
    const profilePicUrl = initialUser?.profilePictureUrl || null;
    
    console.log('✅ Hook inicializado:');
    console.log('   profilePicUrl:', profilePicUrl ? 'PRESENTE' : 'NULL');
    console.log('   Tamaño:', (profilePicUrl?.length || 0), 'caracteres');
    
    // 4. Simular UserProfileAvatar component
    console.log('\n🖼️ PASO 3: UserProfileAvatar recibe props...');
    const user = initialUser;
    
    console.log('Props recibidas:');
    console.log('   user.name:', user.name);
    console.log('   profilePicUrl:', profilePicUrl ? 'PRESENTE' : 'NULL');
    
    // En el componente:
    const isBase64 = profilePicUrl?.startsWith('data:image');
    const currentProfilePic = isBase64 
      ? profilePicUrl 
      : (profilePicUrl || `https://i.pravatar.cc/150?u=${user.id}`);
    
    console.log('\nValores calculados en componente:');
    console.log('   hasProfilePicUrl:', !!profilePicUrl);
    console.log('   isBase64:', isBase64);
    console.log('   currentProfilePic (primeros 60):', currentProfilePic.substring(0, 60));
    console.log('   willShowImage:', isBase64 || !!profilePicUrl);
    
    // 5. Diagnóstico
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNÓSTICO:\n');
    
    if (!currentUser.profilePictureUrl) {
      console.log('❌ PROBLEMA: El API NO devuelve profilePictureUrl');
      console.log('   Verifica: src/app/api/users/current/route.ts');
    } else if (!profilePicUrl) {
      console.log('❌ PROBLEMA: El hook NO inicializa profilePicUrl');
      console.log('   Verifica: src/hooks/useUserProfile.ts línea ~19');
    } else if (!isBase64) {
      console.log('❌ PROBLEMA: profilePicUrl NO es base64');
      console.log('   Valor actual:', currentUser.profilePictureUrl.substring(0, 100));
    } else {
      console.log('✅ TODO CORRECTO - Los datos llegan bien al componente');
      console.log('');
      console.log('🎯 Si aún no ves la imagen, el problema es:');
      console.log('   1. El navegador no está recargando (intenta Ctrl+Shift+R)');
      console.log('   2. O hay un error en el renderizado del <img>');
      console.log('');
      console.log('📝 Verifica en la consola del navegador:');
      console.log('   - Si aparece: "🖼️ UserProfileAvatar render"');
      console.log('   - Si aparece: "✅ Imagen cargada correctamente"');
      console.log('   - O si aparece: "❌ Error cargando imagen"');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

verifyComponentData();

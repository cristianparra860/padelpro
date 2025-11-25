const fetch = require('node-fetch');

async function simulateAvatarRender() {
  try {
    console.log('🎭 SIMULANDO RENDERIZADO DEL AVATAR\n');
    console.log('='.repeat(70));
    
    // 1. Login
    const loginRes = await fetch('http://localhost:9002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jugador1@padelpro.com',
        password: 'password123'
      })
    });
    
    const { token } = await loginRes.json();
    console.log('\n✅ Login exitoso con Juan Pérez');
    
    // 2. Cargar usuario
    console.log('\n📡 Llamando /api/users/current...');
    const userRes = await fetch('http://localhost:9002/api/users/current', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userData = await userRes.json();
    console.log('✅ Usuario cargado:', userData.name);
    console.log('   Tiene foto:', !!userData.profilePictureUrl);
    
    if (!userData.profilePictureUrl) {
      console.log('\n❌ ERROR: Usuario NO tiene foto en la base de datos');
      console.log('   Esto significa que el script anterior no funcionó');
      return;
    }
    
    console.log('   Es base64:', userData.profilePictureUrl.startsWith('data:image') ? 'SÍ' : 'NO');
    console.log('   Tamaño:', userData.profilePictureUrl.length, 'caracteres');
    console.log('   Primeros 80:', userData.profilePictureUrl.substring(0, 80));
    
    // 3. Simular el componente React
    console.log('\n🖼️ SIMULANDO COMPONENTE UserProfileAvatar:\n');
    
    const imageSrc = userData.profilePictureUrl;
    const hasImage = imageSrc && imageSrc.startsWith('data:image');
    
    console.log('Estado del componente:');
    console.log('   imageSrc:', hasImage ? 'PRESENTE' : 'AUSENTE');
    console.log('   imageError: false');
    console.log('   Debería mostrar:', hasImage ? 'IMAGEN' : 'INICIALES');
    
    if (hasImage) {
      console.log('\n📝 HTML que se renderizaría:');
      console.log('<div className="...gradient...">');
      console.log(`  <img`);
      console.log(`    src="${imageSrc.substring(0, 60)}..."`);
      console.log(`    alt="Foto de perfil de ${userData.name}"`);
      console.log(`    className="w-full h-full object-cover"`);
      console.log(`  />`);
      console.log('</div>');
      
      // Verificar que el data URL es válido
      console.log('\n🔍 VALIDANDO DATA URL:\n');
      
      const parts = imageSrc.split(',');
      if (parts.length === 2) {
        const header = parts[0]; // data:image/svg+xml;base64
        const data = parts[1];    // base64 data
        
        console.log('✅ Estructura válida:');
        console.log('   Header:', header);
        console.log('   Data length:', data.length, 'caracteres');
        
        // Decodificar base64
        try {
          const decoded = Buffer.from(data, 'base64').toString('utf8');
          console.log('✅ Base64 decodifica correctamente');
          console.log('   Contenido:', decoded.substring(0, 100) + '...');
          
          if (decoded.includes('<svg')) {
            console.log('✅ Contiene un SVG válido');
            console.log('\n' + '='.repeat(70));
            console.log('🎯 CONCLUSIÓN:\n');
            console.log('✅ La foto ES VÁLIDA y debería renderizarse');
            console.log('✅ El backend funciona correctamente');
            console.log('✅ El data URL es correcto');
            console.log('\n⚠️ Si no ves la imagen en el navegador, el problema es:');
            console.log('   1. El componente React no está actualizando el estado');
            console.log('   2. O el navegador tiene caché');
            console.log('\n💡 SOLUCIÓN:');
            console.log('   - Presiona Ctrl+Shift+Delete');
            console.log('   - Selecciona "Imágenes y archivos en caché"');
            console.log('   - Haz clic en "Borrar datos"');
            console.log('   - Recarga la página con Ctrl+Shift+R');
          } else {
            console.log('⚠️ No parece ser un SVG válido');
          }
        } catch (e) {
          console.log('❌ Error decodificando base64:', e.message);
        }
      } else {
        console.log('❌ Data URL mal formado');
      }
    } else {
      console.log('\n❌ NO debería haber imagen, solo iniciales');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

simulateAvatarRender();

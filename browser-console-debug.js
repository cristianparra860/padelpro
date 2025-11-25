// Ejecuta este código en la consola del navegador (F12)
// Copia y pega todo esto en la consola:

(async function() {
  console.clear();
  console.log('🔍 DIAGNÓSTICO RÁPIDO\n');
  
  const token = localStorage.getItem('auth_token');
  console.log('1️⃣ Token:', token ? '✅ Presente' : '❌ Ausente');
  
  if (!token) {
    console.log('\n❌ No hay token. Necesitas hacer login primero.');
    return;
  }
  
  const response = await fetch('/api/users/current', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const user = await response.json();
  
  console.log('\n2️⃣ Usuario actual:');
  console.log('   Nombre:', user.name);
  console.log('   Email:', user.email);
  console.log('   ID:', user.id);
  
  console.log('\n3️⃣ Foto de perfil:');
  console.log('   Tiene foto:', !!user.profilePictureUrl);
  
  if (user.profilePictureUrl) {
    console.log('   Es base64:', user.profilePictureUrl.startsWith('data:image') ? '✅ SÍ' : '❌ NO');
    console.log('   Tamaño:', Math.round(user.profilePictureUrl.length / 1024), 'KB');
    console.log('   Primeros 80 caracteres:', user.profilePictureUrl.substring(0, 80));
    
    // Crear imagen de prueba
    console.log('\n4️⃣ Probando renderizar imagen...');
    const img = document.createElement('img');
    img.src = user.profilePictureUrl;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.border = '3px solid lime';
    img.style.position = 'fixed';
    img.style.top = '10px';
    img.style.right = '10px';
    img.style.zIndex = '99999';
    img.style.borderRadius = '50%';
    
    img.onload = () => {
      console.log('✅ La imagen se renderizó correctamente');
      console.log('   Deberías ver un círculo verde en la esquina superior derecha');
      document.body.appendChild(img);
      
      setTimeout(() => {
        if (confirm('¿Ves el círculo verde con tu foto? (Se eliminará al aceptar)')) {
          img.remove();
          console.log('✅ TODO FUNCIONA. El problema está en el componente UserProfileAvatar');
        } else {
          img.remove();
          console.log('❌ La imagen no se ve bien. Puede estar corrupta o ser muy pequeña');
        }
      }, 2000);
    };
    
    img.onerror = () => {
      console.log('❌ Error al renderizar la imagen');
      console.log('   La foto en base64 puede estar corrupta');
    };
    
  } else {
    console.log('   ❌ NO tiene foto en la base de datos');
    console.log('\n💡 Solución:');
    console.log('   La foto que subiste NO se guardó en la base de datos');
    console.log('   Verifica la consola cuando haces clic en "Cambiar foto"');
  }
})();

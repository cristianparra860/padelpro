console.log(`
═══════════════════════════════════════════════════════════════════════════════
🔍 INSTRUCCIONES PARA VERIFICAR EN EL NAVEGADOR
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Abre http://localhost:9002/profile

PASO 2: Presiona F12 para abrir DevTools

PASO 3: Ve a la pestaña "Console" (Consola)

PASO 4: Pega este código y presiona Enter:

═══════════════════════════════════════════════════════════════════════════════
const token = localStorage.getItem('auth_token');
console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'NO HAY TOKEN');

fetch('/api/users/current', {
  headers: { 'Authorization': \`Bearer \${token}\` }
})
.then(r => r.json())
.then(data => {
  console.log('\\n📊 DATOS DEL USUARIO:');
  console.log('   Name:', data.name);
  console.log('   Email:', data.email);
  console.log('   hasProfilePictureUrl:', !!data.profilePictureUrl);
  console.log('   profilePictureUrl:', data.profilePictureUrl?.substring(0, 80));
  
  if (data.profilePictureUrl) {
    console.log('\\n✅ LA FOTO ESTÁ EN LA RESPUESTA DEL API');
    console.log('\\n🖼️ Probando si se puede renderizar...');
    
    // Crear img temporal para probar
    const testImg = document.createElement('img');
    testImg.src = data.profilePictureUrl;
    testImg.style.width = '100px';
    testImg.style.height = '100px';
    testImg.onload = () => console.log('✅ ¡IMAGEN SE PUEDE RENDERIZAR!');
    testImg.onerror = () => console.log('❌ Error al renderizar imagen');
    document.body.appendChild(testImg);
    
    console.log('\\n🎯 Revisa si apareció una imagen pequeña en la página');
  } else {
    console.log('\\n❌ LA FOTO NO ESTÁ EN LA RESPUESTA DEL API');
    console.log('   Esto significa que el backend no la está enviando');
  }
})
.catch(err => console.error('❌ Error:', err));
═══════════════════════════════════════════════════════════════════════════════

PASO 5: Lee los resultados en la consola y dime:
   ¿Dice "✅ LA FOTO ESTÁ EN LA RESPUESTA DEL API"?
   ¿Apareció una imagen pequeña en la página?

═══════════════════════════════════════════════════════════════════════════════
`);

// Test directo al endpoint DELETE de matchgames
const fetch = require('node-fetch');

async function testDeleteEndpoint() {
  const matchIdToDelete = 'cmk4z0etz002ltg7sh5diu4fr'; // Primera partida del día 11
  
  console.log(`🧪 Probando DELETE /api/admin/matchgames/${matchIdToDelete}\n`);
  
  try {
    const response = await fetch(`http://localhost:9002/api/admin/matchgames/${matchIdToDelete}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    console.log('📦 Respuesta:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Eliminación exitosa');
    } else {
      console.log('\n❌ Error en la eliminación');
    }
    
  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    console.error('\n⚠️  Asegúrate de que el servidor dev esté corriendo en el puerto 9002');
    console.error('   Ejecuta: npm run dev');
  }
}

testDeleteEndpoint();

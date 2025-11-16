async function triggerGenerator() {
  try {
    console.log('🤖 Llamando al API de generación de propuestas...\n');
    
    const response = await fetch('http://localhost:9002/api/cron/generate-cards?days=7', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('📊 Respuesta:', JSON.stringify(data, null, 2));
    
    if (data.generated) {
      console.log(`\n✅ ${data.generated} propuestas generadas exitosamente!`);
    } else if (data.error) {
      console.error(`\n❌ Error: ${data.error}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Esperar 5 segundos antes de ejecutar para dar tiempo al servidor
setTimeout(triggerGenerator, 5000);
console.log('⏳ Esperando 5 segundos para que el servidor esté listo...');

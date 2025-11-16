// Verificación rápida de la respuesta JSON

async function quickCheck() {
  try {
    console.log('🔍 Consultando API...\n');
    
    const response = await fetch('http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2025-10-01T00:00:00.000Z&endDate=2025-10-31T23:59:59.999Z');
    const data = await response.json();
    
    console.log('📊 RESULTADO:');
    console.log('   Propuestas:', data.proposedClasses);
    console.log('   Confirmadas:', data.confirmedClasses);
    console.log('   Total eventos:', data.events?.length || 0);
    
    if (data.events && data.events.length > 0) {
      const proposals = data.events.filter(e => e.type === 'proposal');
      const confirmed = data.events.filter(e => e.type === 'confirmed');
      
      console.log('\n📋 EVENTOS:');
      console.log('   🔶 Propuestas:', proposals.length);
      console.log('   🟢 Confirmadas:', confirmed.length);
      
      if (proposals.length > 0) {
        console.log('\n✅ TODO FUNCIONA CORRECTAMENTE');
        console.log('\n🎯 Ahora ve al navegador:');
        console.log('   http://localhost:9002/admin/database');
        console.log('   Presiona Ctrl+Shift+R para recargar');
        console.log('   Deberías ver', data.proposedClasses, 'cuadrados naranjas');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCheck();

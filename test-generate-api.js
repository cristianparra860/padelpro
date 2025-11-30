async function generateProposals() {
  try {
    console.log('🚀 Generando propuestas para los próximos 30 días...\n');
    
    const response = await fetch('http://localhost:9002/api/admin/generate-proposals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daysAhead: 30,
        clubId: 'padel-estrella-madrid',
        cleanOld: true
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Propuestas generadas exitosamente:\n');
      console.log(`   📊 Slots creados: ${result.slotsCreated}`);
      console.log(`   ⏭️  Slots omitidos: ${result.slotsSkipped}`);
      console.log(`   ❌ Errores: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n⚠️  Errores encontrados:');
        result.errors.forEach(err => console.log(`   - ${err}`));
      }
    } else {
      console.error('❌ Error en la generación:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateProposals();

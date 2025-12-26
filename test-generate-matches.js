const fetch = require('node-fetch');

async function testGenerateMatches() {
  console.log('\n🧪 TEST: Auto-generación de Partidas\n');
  console.log('='.repeat(60));

  try {
    const response = await fetch('http://localhost:9002/api/cron/generate-matches', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dev-secret'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ Error: ${error.error}`);
      console.log(`   Status: ${response.status}`);
      return;
    }

    const result = await response.json();
    
    console.log(`✅ ${result.message}`);
    console.log(`\n📊 Estadísticas:`);
    console.log(`   - Partidas creadas: ${result.generated}`);
    console.log(`   - Partidas omitidas (ya existían): ${result.skipped}`);
    console.log(`   - Total procesadas: ${result.generated + result.skipped}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testGenerateMatches();

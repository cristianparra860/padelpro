// Test: Generación automática del día 30
// Verifica que el cron job genera correctamente las clases

async function testDay30Generation() {
  try {
    console.log('🧪 Testing automatic day 30 generation...\n');

    // Calcular fecha objetivo (día 30)
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 30);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log('📅 Today:', today.toISOString().split('T')[0]);
    console.log('📅 Target date (day +30):', targetDateStr);
    console.log('');

    // Llamar al endpoint
    const url = 'http://localhost:9002/api/cron/generate-cards?targetDay=30';
    console.log('🔗 Calling:', url);
    console.log('');

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS!');
      console.log('');
      console.log('📊 Results:');
      console.log('   Target date:', data.targetDate);
      console.log('   Days ahead:', data.daysAhead);
      console.log('   Classes created:', data.created);
      console.log('   Skipped:', data.skipped);
      console.log('');
      console.log('💡 The cron will run daily at 00:00 UTC to keep a 30-day window');
    } else {
      console.error('❌ FAILED:', data.error);
      if (data.details) {
        console.error('   Details:', data.details);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDay30Generation();

// Llenar calendario completo de 30 días (ejecución inicial)
// Este script se ejecuta UNA VEZ para llenar todo el calendario

async function fillCalendar30Days() {
  try {
    console.log('🌱 Filling complete 30-day calendar...\n');

    let totalCreated = 0;
    let totalSkipped = 0;

    // Generar cada día del 0 al 30
    for (let day = 0; day <= 30; day++) {
      console.log(`📅 Generating day +${day}...`);
      
      const url = `http://localhost:9002/api/cron/generate-cards?targetDay=${day}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        totalCreated += data.created;
        totalSkipped += data.skipped;
        console.log(`   ✅ ${data.targetDate}: ${data.created} created, ${data.skipped} skipped`);
      } else {
        console.error(`   ❌ Error: ${data.error}`);
      }

      // Pequeña pausa para no saturar la DB
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📊 Summary:');
    console.log(`   Total created: ${totalCreated}`);
    console.log(`   Total skipped: ${totalSkipped}`);
    console.log('');
    console.log('✅ Calendar filled! Now the cron will maintain it daily.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fillCalendar30Days();

// Script para generar clases de los días que faltan
const fetch = require('node-fetch');

async function generateForDay(daysAhead) {
  try {
    console.log(`\n🔄 Generando clases para día +${daysAhead}...`);
    
    const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=${daysAhead}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.targetDate}: ${data.created} clases creadas, ${data.skipped} omitidas`);
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error generando día +${daysAhead}:`, error.message);
  }
}

async function generateRange() {
  console.log('🤖 GENERADOR AUTOMÁTICO DE CLASES');
  console.log('Generando clases para los próximos 30 días...\n');
  
  // Generar para los próximos 30 días
  for (let day = 0; day <= 30; day++) {
    await generateForDay(day);
    // Pequeña pausa para no sobrecargar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Generación completada!');
}

generateRange();

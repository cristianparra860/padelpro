async function generateMissingHours() {
  console.log('Generando clases de 07:00-08:00 para días 11-30...\n');
  
  let total = 0;
  for (let day = 11; day <= 30; day++) {
    const url = `http://localhost:9002/api/cron/generate-cards?targetDay=${day}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      total += data.created;
      if (data.created > 0) {
        console.log(`Day +${day}: ${data.created} nuevas clases creadas`);
      }
    }
  }
  
  console.log(`\nTotal nuevas clases: ${total}`);
}

generateMissingHours();

const http = require('http');

http.get('http://localhost:9002/api/admin/calendar', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log('🔍 SLOTS DE 8:30 EN LA RESPUESTA DE LA API:\n');
      
      // Filtrar slots de 8:30
      const slots830 = json.proposedClasses?.filter(p => {
        const d = new Date(p.start);
        return d.getHours() === 8 && d.getMinutes() === 30;
      }) || [];
      
      console.log(`Total slots de 8:30: ${slots830.length}\n`);
      
      if (slots830.length > 0) {
        slots830.forEach(slot => {
          console.log(`✅ ${slot.instructorName} - ${new Date(slot.start).toLocaleString('es-ES')}`);
        });
      } else {
        console.log('❌ NO HAY SLOTS DE 8:30 EN LA API');
        
        // Mostrar el primer slot para ver desde qué hora empiezan
        if (json.proposedClasses?.length > 0) {
          const first = json.proposedClasses[0];
          const d = new Date(first.start);
          console.log(`\nPrimer slot: ${d.toLocaleString('es-ES')}`);
        }
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('Error en request:', err.message);
});

const http = require('http');

// Simular la petición que hace el frontend
const url = 'http://localhost:9002/api/admin/calendar';

console.log('📡 Consultando API sin parámetros (como hace el frontend):\n');
console.log(`URL: ${url}\n`);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log('📊 RESPUESTA:\n');
      console.log(`Total propuestas: ${json.proposedClasses?.length || 0}`);
      console.log(`Total confirmadas: ${json.confirmedClasses?.length || 0}`);
      
      // Analizar rango de fechas de las propuestas
      if (json.proposedClasses && json.proposedClasses.length > 0) {
        const dates = json.proposedClasses.map(p => new Date(p.start));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        console.log(`\nRango de fechas:`);
        console.log(`  Desde: ${minDate.toLocaleString('es-ES')}`);
        console.log(`  Hasta: ${maxDate.toLocaleString('es-ES')}`);
        
        // Verificar si hay slots de 8:00 o 8:30
        const morning = json.proposedClasses.filter(p => {
          const d = new Date(p.start);
          return d.getHours() === 8 && (d.getMinutes() === 0 || d.getMinutes() === 30);
        });
        
        console.log(`\n🌅 Slots de 8:00-8:30: ${morning.length}`);
        
        if (morning.length === 0) {
          console.log('\n⚠️ NO HAY SLOTS DE 8:00-8:30 EN LA RESPUESTA');
          
          // Mostrar los primeros slots para ver desde qué hora empiezan
          const first5 = json.proposedClasses
            .slice(0, 5)
            .map(p => {
              const d = new Date(p.start);
              return `${d.toLocaleDateString('es-ES')} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            });
          
          console.log('\nPrimeros 5 slots devueltos:');
          first5.forEach(s => console.log(`  - ${s}`));
        } else {
          console.log('\n✅ Hay slots de 8:00-8:30');
          console.log('Ejemplos:');
          morning.slice(0, 3).forEach(p => {
            const d = new Date(p.start);
            console.log(`  - ${d.toLocaleString('es-ES')} | Instructor: ${p.instructorName}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Error en request:', err.message);
});

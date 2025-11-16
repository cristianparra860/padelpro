const http = require('http');

http.get('http://localhost:9002/api/admin/calendar', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log('📊 RESPUESTA DEL API:\n');
      console.log(`Total propuestas: ${json.proposedClasses?.length || 0}`);
      console.log(`Total confirmadas: ${json.confirmedClasses?.length || 0}\n`);
      
      // Agrupar propuestas por instructor
      const byInstructor = {};
      
      for (const proposal of (json.proposedClasses || [])) {
        const instId = proposal.instructorId;
        if (!byInstructor[instId]) {
          byInstructor[instId] = {
            name: proposal.instructorName || 'Unknown',
            slots: []
          };
        }
        
        const start = new Date(proposal.start);
        const time = `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`;
        byInstructor[instId].slots.push(time);
      }
      
      console.log('📋 PROPUESTAS POR INSTRUCTOR (desde API):\n');
      
      for (const [instId, data] of Object.entries(byInstructor)) {
        console.log(`${data.name}: ${data.slots.length} propuestas`);
        
        // Verificar si faltan slots
        const allTimes = [];
        for (let h = 8; h < 22; h++) {
          for (const m of [0, 30]) {
            allTimes.push(`${h}:${m.toString().padStart(2, '0')}`);
          }
        }
        
        const existing = new Set(data.slots);
        const missing = allTimes.filter(t => !existing.has(t));
        
        if (missing.length > 0) {
          console.log(`  ⚠️ FALTAN ${missing.length}: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
        }
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('Error en request:', err.message);
});

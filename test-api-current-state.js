/**
 * Verificación del estado actual del API después de revertir cambios
 */

async function testCurrentState() {
  console.log('🔍 Verificando estado actual del API...\n');
  
  const clubId = 'padel-estrella-madrid';
  const date = '2024-11-24'; // Fecha correcta según los datos
  
  try {
    const url = `http://localhost:9002/api/timeslots?clubId=${clubId}&date=${date}`;
    console.log('📡 URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    const timeSlots = data.slots || [];
    
    console.log(`\n📊 Total slots devueltos: ${timeSlots.length}`);
    
    if (timeSlots.length === 0) {
      console.log('\n⚠️ No se encontraron slots. Esto puede ser normal si no hay datos para esa fecha.');
      return;
    }
    
    // Agrupar por hora
    const byHour = {};
    timeSlots.forEach(slot => {
      const startDate = new Date(slot.start);
      const hour = startDate.getUTCHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(slot);
    });
    
    console.log('\n📋 Slots por hora (UTC):');
    Object.keys(byHour).sort((a, b) => a - b).forEach(hour => {
      const slots = byHour[hour];
      console.log(`   ${hour}:00 → ${slots.length} slots`);
      
      // Contar instructores
      const instructors = {};
      slots.forEach(slot => {
        const name = slot.instructor?.name || 'Sin instructor';
        instructors[name] = (instructors[name] || 0) + 1;
      });
      
      Object.entries(instructors).forEach(([name, count]) => {
        console.log(`      - ${name}: ${count} tarjeta(s)`);
      });
    });
    
    // Buscar Carlos Martinez específicamente
    const carlosSlots = timeSlots.filter(slot => slot.instructor?.name === 'Carlos Martinez');
    console.log(`\n🎯 Carlos Martinez: ${carlosSlots.length} slots totales`);
    
    if (carlosSlots.length > 0) {
      const by7AM = carlosSlots.filter(slot => {
        const hour = new Date(slot.start).getUTCHours();
        return hour === 6; // 06:00 UTC = 07:00 España
      });
      
      console.log(`   - A las 7:00 AM: ${by7AM.length} slots`);
      by7AM.forEach(slot => {
        console.log(`      ${slot.level} | ${slot.genderCategory || 'sin categoría'} | ID: ${slot.id.substring(0, 10)}...`);
      });
    }
    
    console.log('\n✅ API funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Esperar 2 segundos para que el servidor esté listo
setTimeout(testCurrentState, 2000);

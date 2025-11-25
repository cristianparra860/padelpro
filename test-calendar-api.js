// Test del API del calendario para Dec 17
const url = 'http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&month=12&year=2025';

try {
  const response = await fetch(url);
  const data = await response.json();
  
  // Filtrar solo dic 17
  const dec17 = data.filter(cls => {
    const date = new Date(cls.start);
    return date.getDate() === 17 && date.getMonth() === 11; // Diciembre = 11
  });
  
  console.log(`=== DIC 17: Total clases en respuesta API: ${dec17.length} ===\n`);
  
  // Agrupar por hora
  const byHour = {};
  dec17.forEach(cls => {
    const date = new Date(cls.start);
    const hour = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    byHour[hour] = (byHour[hour] || 0) + 1;
  });
  
  const hours = Object.keys(byHour).sort((a, b) => {
    const [ha, ma] = a.split(':').map(Number);
    const [hb, mb] = b.split(':').map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });
  
  console.log('Clases por hora (local):');
  hours.forEach(hour => {
    console.log(`  ${hour}: ${byHour[hour]} clases`);
  });
  
  // Buscar clases después de 21:30
  const late = dec17.filter(cls => {
    const date = new Date(cls.start);
    const hour = date.getHours();
    const min = date.getMinutes();
    return hour > 21 || (hour === 21 && min > 30);
  });
  
  if (late.length > 0) {
    console.log(`\n  CLASES FUERA DE HORARIO: ${late.length}`);
    late.forEach(cls => {
      const date = new Date(cls.start);
      console.log(`  ${date.toLocaleString('es-ES')} - ${cls.instructorName} - Players: ${cls.playersCount}`);
    });
  } else {
    console.log('\n No hay clases fuera de horario (todas antes de 22:00)');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}

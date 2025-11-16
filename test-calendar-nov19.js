// Test calendario 19 noviembre
const fetch = require('node-fetch');

async function testCalendar() {
  const url = 'http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&startDate=2025-11-19T00:00:00.000Z&endDate=2025-11-19T23:59:59.999Z';
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('📅 19 NOVIEMBRE 2025\n');
  console.log('📊 RESUMEN:');
  console.log(`  Pistas: ${data.courts?.length || 0}`);
  console.log(`  Instructores: ${data.instructors?.length || 0}`);
  console.log(`  Propuestas: ${data.proposedClasses?.length || 0}`);
  console.log(`  Confirmadas: ${data.confirmedClasses?.length || 0}\n`);
  
  console.log('🟠 PROPUESTAS (primeras 10):');
  (data.proposedClasses || []).slice(0, 10).forEach((cls, i) => {
    const start = new Date(cls.start);
    console.log(`  ${i+1}. ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${cls.instructorName} - ${cls.level}`);
  });
  
  console.log('\n🟢 CONFIRMADAS:');
  (data.confirmedClasses || []).forEach((cls, i) => {
    const start = new Date(cls.start);
    const end = new Date(cls.end);
    console.log(`  ${i+1}. ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}-${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - Pista ${cls.courtNumber} - ${cls.instructorName} - ${cls.playersCount}/${cls.maxPlayers}`);
  });
}

testCalendar().catch(console.error);

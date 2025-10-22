// Script para probar el flujo completo del calendario
// 1. Consultar clases propuestas (ABIERTO)
// 2. Ver clases confirmadas con alumnos
// 3. Verificar estructura del API

const BASE_URL = 'http://localhost:9002';

async function testCalendarFlow() {
  console.log('🧪 TESTING: Flujo completo del calendario\n');

  // Fecha de hoy
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Fecha: ${today}\n`);

  try {
    // 1. Consultar API del calendario
    console.log('📡 1. Consultando API del calendario...');
    const calendarUrl = `${BASE_URL}/api/admin/calendar?clubId=club-1&startDate=${today}T00:00:00.000Z&endDate=${today}T23:59:59.999Z`;
    
    const response = await fetch(calendarUrl);
    const data = await response.json();

    console.log(`✅ Respuesta recibida:\n`);
    console.log(`   📊 Total pistas: ${data.courts?.length || 0}`);
    console.log(`   👨‍🏫 Total instructores: ${data.instructors?.length || 0}`);
    console.log(`   📚 Clases propuestas: ${data.proposedClasses?.length || 0}`);
    console.log(`   ✅ Clases confirmadas: ${data.confirmedClasses?.length || 0}`);
    console.log(`   📋 Total eventos: ${data.events?.length || 0}\n`);

    // 2. Mostrar detalle de clases propuestas
    if (data.proposedClasses && data.proposedClasses.length > 0) {
      console.log('🟠 CLASES PROPUESTAS (ABIERTO):');
      data.proposedClasses.slice(0, 5).forEach((cls, i) => {
        const startTime = new Date(cls.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${startTime} - ${cls.level} - ${cls.instructorName} (${cls.playersCount}/${cls.maxPlayers} alumnos)`);
      });
      if (data.proposedClasses.length > 5) {
        console.log(`   ... y ${data.proposedClasses.length - 5} más`);
      }
      console.log('');
    }

    // 3. Mostrar detalle de clases confirmadas
    if (data.confirmedClasses && data.confirmedClasses.length > 0) {
      console.log('🟢 CLASES CONFIRMADAS:');
      data.confirmedClasses.slice(0, 5).forEach((cls, i) => {
        const startTime = new Date(cls.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${startTime} - ${cls.level} - Pista ${cls.courtNumber} - ${cls.instructorName} (${cls.playersCount}/${cls.maxPlayers} alumnos)`);
      });
      if (data.confirmedClasses.length > 5) {
        console.log(`   ... y ${data.confirmedClasses.length - 5} más`);
      }
      console.log('');
    }

    // 4. Mostrar info de pistas
    if (data.courts && data.courts.length > 0) {
      console.log('🎾 PISTAS DISPONIBLES:');
      data.courts.forEach(court => {
        console.log(`   - Pista ${court.number}: ${court.name}`);
      });
      console.log('');
    }

    // 5. Mostrar info de instructores
    if (data.instructors && data.instructors.length > 0) {
      console.log('👨‍🏫 INSTRUCTORES:');
      data.instructors.forEach(instructor => {
        console.log(`   - ${instructor.name} (€${instructor.hourlyRate}/h)`);
      });
      console.log('');
    }

    // 6. Resumen del summary
    console.log('📈 RESUMEN:');
    console.log(`   Total clases: ${data.summary?.totalClasses || 0}`);
    console.log(`   Propuestas: ${data.summary?.proposedClasses || 0}`);
    console.log(`   Confirmadas: ${data.summary?.confirmedClasses || 0}`);
    console.log(`   Vacías: ${data.summary?.emptyClasses || 0}`);
    console.log(`   Llenas: ${data.summary?.fullClasses || 0}`);
    console.log('');

    console.log('✅ Test completado exitosamente!\n');
    console.log('🌐 Puedes ver el calendario en: http://localhost:9002/admin/database');
    console.log('   → Ir a pestaña "Calendario"\n');

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error(error);
  }
}

// Ejecutar test
testCalendarFlow();

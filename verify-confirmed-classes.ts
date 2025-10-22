/**
 * Verificar qué clases confirmadas hay en la base de datos
 */

async function checkConfirmedClasses() {
  const baseUrl = 'http://localhost:9002';
  
  console.log('🔍 Verificando clases confirmadas en el calendario\n');
  
  try {
    // Obtener datos del calendario para octubre 23, 2025
    const startDate = '2025-10-22T22:00:00.000Z'; // Oct 23 00:00 en España
    const endDate = '2025-10-23T21:59:59.999Z';   // Oct 23 23:59 en España
    
    const url = `${baseUrl}/api/admin/calendar?clubId=club-1&startDate=${startDate}&endDate=${endDate}`;
    console.log('📡 URL:', url);
    console.log('');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ Error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log('📊 Resumen del calendario:');
    console.log(`   Pistas: ${data.courts?.length || 0}`);
    console.log(`   Instructores: ${data.instructors?.length || 0}`);
    console.log(`   Clases propuestas: ${data.proposedClasses?.length || 0}`);
    console.log(`   Clases confirmadas: ${data.confirmedClasses?.length || 0}`);
    console.log('');
    
    if (data.confirmedClasses && data.confirmedClasses.length > 0) {
      console.log('✅ CLASES CONFIRMADAS:');
      data.confirmedClasses.forEach((cls: any, index: number) => {
        console.log(`\n${index + 1}. Clase ${cls.id}`);
        console.log(`   Hora: ${cls.start}`);
        console.log(`   Pista: ${cls.courtNumber}`);
        console.log(`   Instructor: ${cls.instructorName}`);
        console.log(`   Nivel: ${cls.level}`);
        console.log(`   Jugadores: ${cls.playersCount}/${cls.maxPlayers}`);
        console.log(`   Color: ${cls.color}`);
      });
    } else {
      console.log('⚠️  No hay clases confirmadas');
    }
    
    // También verificar en la lista events (por compatibilidad)
    if (data.events) {
      const confirmedEvents = data.events.filter((e: any) => e.type === 'class-confirmed');
      console.log(`\n📋 Eventos confirmados (lista events): ${confirmedEvents.length}`);
      
      if (confirmedEvents.length > 0) {
        confirmedEvents.forEach((evt: any, index: number) => {
          console.log(`\n${index + 1}. Evento ${evt.id}`);
          console.log(`   Hora: ${evt.start}`);
          console.log(`   Pista: ${evt.courtNumber}`);
          console.log(`   Instructor: ${evt.instructorName}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkConfirmedClasses();

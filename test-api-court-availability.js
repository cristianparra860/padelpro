// Probar la API /api/timeslots con disponibilidad de pistas
const fetch = require('node-fetch');

async function testAPI() {
  console.log('🔌 PROBANDO API /api/timeslots CON DISPONIBILIDAD DE PISTAS\n');
  
  try {
    // Obtener fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Fecha de prueba: ${dateStr}\n`);
    
    const url = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}`;
    console.log(`🌐 URL: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ Respuesta HTTP ${response.status}`);
    console.log(`📊 Total slots recibidos: ${data.length}\n`);
    
    if (data.length > 0) {
      // Analizar primer slot
      const firstSlot = data[0];
      console.log('🔍 ANÁLISIS DEL PRIMER SLOT:\n');
      console.log(`   ID: ${firstSlot.id}`);
      console.log(`   Hora: ${new Date(firstSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(firstSlot.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   Instructor: ${firstSlot.instructorName}`);
      console.log(`   Court ID: ${firstSlot.courtId || 'SIN ASIGNAR'}`);
      
      // Verificar campos de disponibilidad
      console.log(`\n   📋 Campos de disponibilidad de pistas:`);
      if (firstSlot.courtsAvailability) {
        console.log(`   ✅ courtsAvailability: PRESENTE (${firstSlot.courtsAvailability.length} pistas)`);
        console.log(`   ✅ availableCourtsCount: ${firstSlot.availableCourtsCount}`);
        
        console.log(`\n   🏟️ Estado de cada pista:`);
        firstSlot.courtsAvailability.forEach(court => {
          const emoji = court.status === 'available' ? '🟢' : court.status === 'occupied' ? '🔴' : '⚫';
          const statusText = court.status === 'available' ? 'DISPONIBLE' : court.status === 'occupied' ? 'OCUPADA' : 'NO DISPONIBLE';
          console.log(`   ${emoji} Pista ${court.courtNumber}: ${statusText}`);
        });
        
        if (firstSlot.availableCourtsCount === 0) {
          console.log(`\n   ⚠️ ESTE SLOT DEBERÍA ESTAR FILTRADO (0 pistas disponibles)`);
        } else {
          console.log(`\n   ✅ ESTE SLOT DEBE MOSTRARSE (${firstSlot.availableCourtsCount} pistas disponibles)`);
        }
      } else {
        console.log(`   ❌ courtsAvailability: AUSENTE`);
        console.log(`   ❌ availableCourtsCount: ${firstSlot.availableCourtsCount || 'AUSENTE'}`);
      }
      
      // Estadísticas generales
      console.log(`\n📊 ESTADÍSTICAS GENERALES:\n`);
      
      const withCourtAvailability = data.filter(s => s.courtsAvailability).length;
      const withoutCourtAvailability = data.length - withCourtAvailability;
      
      console.log(`   Slots con courtsAvailability: ${withCourtAvailability}/${data.length}`);
      console.log(`   Slots sin courtsAvailability: ${withoutCourtAvailability}/${data.length}`);
      
      if (withCourtAvailability > 0) {
        const zeorAvailable = data.filter(s => s.availableCourtsCount === 0).length;
        const someAvailable = data.filter(s => s.availableCourtsCount > 0).length;
        
        console.log(`\n   Slots sin pistas disponibles (deberían ocultarse): ${zeorAvailable}`);
        console.log(`   Slots con pistas disponibles (deben mostrarse): ${someAvailable}`);
      }
      
      // Mostrar slots confirmados
      const confirmed = data.filter(s => s.courtId !== null);
      console.log(`\n   Slots confirmados (con pista asignada): ${confirmed.length}`);
      
      if (confirmed.length > 0) {
        console.log(`\n   📍 CLASES CONFIRMADAS:`);
        confirmed.forEach(cls => {
          const start = new Date(cls.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          const end = new Date(cls.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          console.log(`      🎾 Pista ${cls.courtNumber}: ${start}-${end} | ${cls.instructorName}`);
        });
      }
    } else {
      console.log('⚠️ No hay slots disponibles para hoy');
    }
    
    console.log(`\n✅ Test API completado\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();

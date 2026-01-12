// Test para ver el error del API del calendario
const fetch = require('node-fetch');

async function testCalendarAPI() {
  try {
    // Obtener el primer club
    const clubRes = await fetch('http://localhost:9002/api/clubs');
    const clubs = await clubRes.json();
    
    if (!clubs || clubs.length === 0) {
      console.log('❌ No hay clubs en la BD');
      return;
    }
    
    const clubId = clubs[0].id;
    console.log('✅ Club ID:', clubId);
    
    // Probar el API del calendario
    const today = new Date().toISOString().split('T')[0];
    const url = `http://localhost:9002/api/admin/calendar?clubId=${clubId}&date=${today}`;
    console.log('📡 URL:', url);
    
    const calendarRes = await fetch(url);
    const responseText = await calendarRes.text();
    
    console.log('\n📊 Status:', calendarRes.status);
    console.log('📄 Response:', responseText.substring(0, 500));
    
    if (!calendarRes.ok) {
      console.log('\n❌ ERROR en API del calendario');
      try {
        const errorJson = JSON.parse(responseText);
        console.log('🔴 Error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('🔴 Error text:', responseText);
      }
    } else {
      console.log('\n✅ API funcionando correctamente');
      const data = JSON.parse(responseText);
      console.log('📊 Datos recibidos:', {
        courts: data.courts?.length,
        instructors: data.instructors?.length,
        proposedClasses: data.proposedClasses?.length,
        confirmedClasses: data.confirmedClasses?.length,
        courtReservations: data.courtReservations?.length
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testCalendarAPI();

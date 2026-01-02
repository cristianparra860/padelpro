const fetch = require('node-fetch');

async function checkCalendarAPI() {
  console.log('🔍 Verificando respuesta del API de calendario...\n');
  
  try {
    const response = await fetch('http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2026-01-04&endDate=2026-01-05');
    const data = await response.json();
    
    // Filtrar solo las partidas de las 9:00
    const matchGames9AM = data.matchGames?.filter(mg => {
      const hour = new Date(mg.start).getHours();
      return hour === 9;
    }) || [];
    
    console.log(`📊 Encontradas ${matchGames9AM.length} partidas a las 9:00\n`);
    
    matchGames9AM.forEach((mg, index) => {
      console.log(`${index + 1}. Partida ${mg.id}`);
      console.log(`   - Hora: ${new Date(mg.start).toLocaleString()}`);
      console.log(`   - Pista: ${mg.courtNumber || 'Sin asignar'}`);
      console.log(`   - Bookings: ${mg.bookings.length}`);
      
      if (mg.bookings.length > 0) {
        mg.bookings.forEach((booking, bIndex) => {
          console.log(`\n   Booking ${bIndex + 1}:`);
          console.log(`     * ID: ${booking.id}`);
          console.log(`     * Usuario: ${booking.user?.name || 'N/A'}`);
          console.log(`     * Status: ${booking.status}`);
          console.log(`     * GroupSize: ${booking.groupSize || 'UNDEFINED'} ❌`);
          console.log(`     * AmountBlocked: ${booking.amountBlocked || 'UNDEFINED'}`);
        });
      }
      
      console.log('\n   ================================================\n');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCalendarAPI();

// Script para diagnosticar qué recibe el frontend del API de calendario
const fetch = require('node-fetch');

async function checkCalendarAPI() {
  try {
    const startDate = '2026-01-04T00:00:00.000Z';
    const endDate = '2026-01-04T23:59:59.999Z';
    
    const url = `http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=${startDate}&endDate=${endDate}`;
    console.log('🔍 Fetching:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\n📊 CONFIRMEDMATCHES:');
    console.log('Total:', data.confirmedMatches?.length || 0);
    
    if (data.confirmedMatches && data.confirmedMatches.length > 0) {
      // Filtrar solo las de 9:00
      const matches9AM = data.confirmedMatches.filter(m => {
        const hour = new Date(m.start).getHours();
        return hour === 9;
      });
      
      console.log('\n🎯 PARTIDAS DE LAS 9:00 AM:', matches9AM.length);
      
      matches9AM.forEach((match, idx) => {
        console.log(`\n--- Partida ${idx + 1} ---`);
        console.log('ID:', match.id);
        console.log('Start:', match.start);
        console.log('Court:', match.courtNumber);
        console.log('Bookings:', match.bookings?.length || 0);
        
        if (match.bookings && match.bookings.length > 0) {
          console.log('\n   📝 BOOKINGS:');
          match.bookings.forEach((booking, bIdx) => {
            console.log(`\n   Booking ${bIdx + 1}:`);
            console.log('   - id:', booking.id);
            console.log('   - userId:', booking.userId);
            console.log('   - status:', booking.status);
            console.log('   - groupSize:', booking.groupSize || '❌ UNDEFINED');
            console.log('   - amountBlocked:', booking.amountBlocked || '❌ UNDEFINED');
            console.log('   - user.name:', booking.user?.name);
            console.log('   - Todos los campos:', Object.keys(booking));
          });
        }
      });
    } else {
      console.log('❌ No hay confirmedMatches');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCalendarAPI();

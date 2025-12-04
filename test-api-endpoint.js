// Quick test of the /api/timeslots endpoint
async function testApiEndpoint() {
  try {
    console.log('🌐 Testing /api/timeslots endpoint...\n');

    // Test with date filter for December 6th, 2025
    const date = '2025-12-06';
    const url = `http://localhost:9002/api/timeslots?clubId=club-1&date=${date}&_t=${Date.now()}`;

    console.log('📡 Fetching:', url);

    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ API Response received: ${data.slots?.length || 0} slots\n`);

    // Filter to Cristian Parra classes with bookings
    const cristianSlots = data.slots?.filter(s => 
      s.instructorName?.includes('Cristian') && s.bookings?.length > 0
    ) || [];

    console.log(`📊 Cristian Parra classes with bookings: ${cristianSlots.length}\n`);

    cristianSlots.forEach((slot, i) => {
      const startDate = new Date(slot.start);
      console.log(`${i + 1}. ${startDate.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   🆔 ID: ${slot.id.substring(0, 20)}...`);
      console.log(`   🎯 level: "${slot.level}"`);
      console.log(`   📊 levelRange: "${slot.levelRange}"`);
      console.log(`   👥 Bookings: ${slot.bookings.length}`);
      if (slot.bookings[0]) {
        console.log(`   👤 First user: ${slot.bookings[0].userName} (${slot.bookings[0].userLevel})`);
      }
      console.log('');
    });

    // Also check classes without bookings
    const cristianNoBookings = data.slots?.filter(s => 
      s.instructorName?.includes('Cristian') && (!s.bookings || s.bookings.length === 0)
    ) || [];

    console.log(`\n📋 Cristian Parra classes WITHOUT bookings: ${cristianNoBookings.length}\n`);
    cristianNoBookings.slice(0, 3).forEach((slot, i) => {
      const startDate = new Date(slot.start);
      console.log(`${i + 1}. ${startDate.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   🎯 level: "${slot.level}"`);
      console.log(`   📊 levelRange: "${slot.levelRange}"`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testApiEndpoint();

async function testCalendarDec17() {
  const startDate = new Date('2025-12-01').toISOString();
  const endDate = new Date('2025-12-31').toISOString();
  
  const url = `http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&startDate=${startDate}&endDate=${endDate}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Filtrar propuestas del 17 de diciembre
  const dec17Proposals = data.proposedClasses?.filter(c => c.start.startsWith('2025-12-17')) || [];
  
  console.log(`Proposals for Dec 17: ${dec17Proposals.length}`);
  
  // Buscar las que tienen inscritos
  const withBookings = dec17Proposals.filter(p => p.playersCount > 0);
  
  console.log(`With bookings: ${withBookings.length}`);
  
  if (withBookings.length > 0) {
    console.log('\nProposals with bookings:');
    withBookings.forEach(p => {
      const time = new Date(p.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${time} - ${p.instructorName}: ${p.playersCount} players`);
    });
  }
}

testCalendarDec17();

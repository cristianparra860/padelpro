async function testCalendarBookings() {
  const startDate = new Date('2025-12-01').toISOString();
  const endDate = new Date('2025-12-31').toISOString();
  
  const url = `http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&startDate=${startDate}&endDate=${endDate}`;
  
  console.log('Testing calendar API for December...\n');
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Buscar propuestas del 17 de diciembre
  const dec17Proposals = data.proposedClasses?.filter(c => 
    c.start.startsWith('2025-12-17')
  ) || [];
  
  console.log(`Total proposals Dec 17: ${dec17Proposals.length}`);
  
  // Filtrar las que tienen jugadores
  const withPlayers = dec17Proposals.filter(p => p.playersCount > 0);
  
  console.log(`With players: ${withPlayers.length}\n`);
  
  if (withPlayers.length > 0) {
    console.log('Proposals with players:');
    withPlayers.forEach(p => {
      const time = new Date(p.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${time} - ${p.instructorName}: ${p.playersCount} players (${p.bookings?.length || 0} bookings)`);
    });
  }
  
  // También verificar día 29 nov
  console.log('\n---\n');
  const nov29Proposals = data.proposedClasses?.filter(c => 
    c.start.startsWith('2025-11-29')
  ) || [];
  
  console.log(`Total proposals Nov 29: ${nov29Proposals.length}`);
  const nov29WithPlayers = nov29Proposals.filter(p => p.playersCount > 0);
  console.log(`With players: ${nov29WithPlayers.length}`);
}

testCalendarBookings();

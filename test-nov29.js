async function testNov29() {
  const startDate = new Date('2025-11-01').toISOString();
  const endDate = new Date('2025-11-30').toISOString();
  
  const url = `http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&startDate=${startDate}&endDate=${endDate}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const nov29Proposals = data.proposedClasses?.filter(c => 
    c.start.startsWith('2025-11-29')
  ) || [];
  
  console.log(`Nov 29 proposals: ${nov29Proposals.length}`);
  const withPlayers = nov29Proposals.filter(p => p.playersCount > 0);
  console.log(`With players: ${withPlayers.length}`);
  
  if (withPlayers.length > 0) {
    withPlayers.forEach(p => {
      const time = new Date(p.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${time} - ${p.instructorName}: ${p.playersCount} players`);
    });
  }
}

testNov29();

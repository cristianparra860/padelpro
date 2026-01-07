// Verificar estructura de partidas en el calendario
const fetch = require('node-fetch');

async function checkMatchStructure() {
  console.log('🔍 Verificando estructura de partidas en el API del calendario\n');
  
  try {
    const dateParam = '2026-01-12';
    const startDate = `${dateParam}T00:00:00.000Z`;
    const endDate = `${dateParam}T23:59:59.999Z`;
    
    const url = `http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=${startDate}&endDate=${endDate}`;
    
    console.log('📡 Llamando al API:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\n📊 Resumen del calendario:');
    console.log(`   Partidas propuestas: ${data.proposedMatches?.length || 0}`);
    console.log(`   Partidas confirmadas: ${data.confirmedMatches?.length || 0}`);
    
    if (data.proposedMatches && data.proposedMatches.length > 0) {
      console.log('\n🔵 Partidas propuestas:');
      data.proposedMatches.forEach((match, i) => {
        console.log(`\n   ${i + 1}. ${match.title}`);
        console.log(`      ID: ${match.id}`);
        console.log(`      matchId: ${match.matchId || 'N/A'}`);
        console.log(`      Tipo: ${match.type}`);
        console.log(`      Jugadores: ${match.playersCount}/${match.maxPlayers}`);
        console.log(`      Precio pista: ${match.courtRentalPrice || 'N/A'}€`);
        console.log(`      Hora: ${new Date(match.start).toLocaleTimeString('es-ES')}`);
      });
    }
    
    if (data.confirmedMatches && data.confirmedMatches.length > 0) {
      console.log('\n🟢 Partidas confirmadas:');
      data.confirmedMatches.forEach((match, i) => {
        console.log(`\n   ${i + 1}. ${match.title}`);
        console.log(`      ID: ${match.id}`);
        console.log(`      matchId: ${match.matchId || 'N/A'}`);
        console.log(`      Tipo: ${match.type}`);
        console.log(`      Pista: ${match.courtNumber || 'N/A'}`);
        console.log(`      Jugadores: ${match.playersCount}/${match.maxPlayers}`);
        console.log(`      Precio pista: ${match.courtRentalPrice || 'N/A'}€`);
        console.log(`      Hora: ${new Date(match.start).toLocaleTimeString('es-ES')}`);
      });
    }
    
    console.log('\n✅ Verificación completada');
    console.log('\n📝 Ahora las partidas tienen:');
    console.log('   - id: Usado para identificación en el UI (match-xxxxx)');
    console.log('   - matchId: ID real del MatchGame en la DB (para API calls)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMatchStructure();

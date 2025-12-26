/**
 * TEST: Sistema completo de partidas 4 jugadores
 * 
 * Flujo de prueba:
 * 1. Crear partida abierta
 * 2. Primer jugador se inscribe → clasifica partida + genera nueva abierta
 * 3. 3 jugadores más se inscriben
 * 4. Al 4º jugador → confirmación + asignación de pista
 * 5. Test de cancelación (< 2h y > 2h)
 */

const API_BASE = 'http://localhost:9002';

async function testMatchGameSystem() {
  console.log('\n🧪 ===== TEST SISTEMA DE PARTIDAS =====\n');
  
  try {
    // PASO 1: Crear partida abierta
    console.log('📝 PASO 1: Creando partida abierta...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);
    
    const createMatchResponse = await fetch(`${API_BASE}/api/admin/matchgames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubId: 'test-club-id',
        start: tomorrow.toISOString(),
        end: endTime.toISOString(),
        duration: 60,
        courtRentalPrice: 20,
        pricePerPlayer: 5,
        isOpen: true,
        creditsCost: 50
      })
    });
    
    if (!createMatchResponse.ok) {
      const error = await createMatchResponse.json();
      console.log('❌ Error creando partida:', error);
      console.log('⚠️ Si la API no existe, créala primero: POST /api/admin/matchgames');
      return;
    }
    
    const matchGame = await createMatchResponse.json();
    console.log(`✅ Partida creada: ${matchGame.id}`);
    console.log(`   - isOpen: ${matchGame.isOpen}`);
    console.log(`   - level: ${matchGame.level || 'sin definir'}`);
    
    // PASO 2: Primer jugador se inscribe (clasificación)
    console.log('\n📝 PASO 2: Primer jugador se inscribe (usuario nivel 3.0)...');
    
    const booking1Response = await fetch(`${API_BASE}/api/matchgames/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchGameId: matchGame.id,
        userId: 'test-user-1',
        paymentMethod: 'CREDITS'
      })
    });
    
    const booking1 = await booking1Response.json();
    console.log('Resultado booking 1:', booking1);
    
    if (booking1.success) {
      console.log(`✅ Booking 1 creado`);
      
      // Verificar que la partida se clasificó
      const matchCheckResponse = await fetch(`${API_BASE}/api/matchgames?clubId=test-club-id`);
      const matches = await matchCheckResponse.json();
      const classifiedMatch = matches.find((m: any) => m.id === matchGame.id);
      
      if (classifiedMatch) {
        console.log(`   - Partida clasificada: Nivel ${classifiedMatch.level}, Género ${classifiedMatch.genderCategory}`);
        console.log(`   - isOpen: ${classifiedMatch.isOpen}`);
      }
      
      // Verificar que se creó nueva partida abierta
      const openMatches = matches.filter((m: any) => m.isOpen);
      console.log(`   - Nuevas partidas abiertas: ${openMatches.length}`);
    }
    
    // PASO 3: Segundo jugador
    console.log('\n📝 PASO 3: Segundo jugador se inscribe...');
    
    const booking2Response = await fetch(`${API_BASE}/api/matchgames/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchGameId: matchGame.id,
        userId: 'test-user-2',
        paymentMethod: 'CREDITS'
      })
    });
    
    const booking2 = await booking2Response.json();
    console.log('✅ Booking 2:', booking2.success ? 'OK' : 'FAIL');
    
    // PASO 4: Tercer jugador
    console.log('\n📝 PASO 4: Tercer jugador se inscribe...');
    
    const booking3Response = await fetch(`${API_BASE}/api/matchgames/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchGameId: matchGame.id,
        userId: 'test-user-3',
        paymentMethod: 'POINTS'
      })
    });
    
    const booking3 = await booking3Response.json();
    console.log('✅ Booking 3:', booking3.success ? 'OK' : 'FAIL');
    
    // PASO 5: Cuarto jugador (confirmación)
    console.log('\n📝 PASO 5: Cuarto jugador se inscribe (CONFIRMACIÓN)...');
    
    const booking4Response = await fetch(`${API_BASE}/api/matchgames/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchGameId: matchGame.id,
        userId: 'test-user-4',
        paymentMethod: 'CREDITS'
      })
    });
    
    const booking4 = await booking4Response.json();
    console.log('Resultado booking 4:', booking4);
    
    if (booking4.confirmed) {
      console.log(`🎉 ¡PARTIDA CONFIRMADA!`);
      console.log(`   - Pista asignada: ${booking4.courtNumber}`);
      console.log(`   - ${booking4.message}`);
    }
    
    // PASO 6: Test cancelación
    console.log('\n📝 PASO 6: Test de cancelación (usuario 2)...');
    
    const leaveResponse = await fetch(`${API_BASE}/api/matchgames/${matchGame.id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user-2' })
    });
    
    const leaveResult = await leaveResponse.json();
    console.log('Resultado cancelación:', leaveResult);
    
    if (leaveResult.success) {
      console.log(`✅ Cancelación exitosa`);
      console.log(`   - Reembolso: ${leaveResult.refunded ? 'SÍ' : 'NO'}`);
      console.log(`   - Jugadores restantes: ${leaveResult.remainingPlayers}`);
    }
    
    console.log('\n✅ ===== TEST COMPLETADO =====\n');
    
  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error);
  }
}

// Ejecutar test
testMatchGameSystem();

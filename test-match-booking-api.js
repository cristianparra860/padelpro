const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9002';

async function testMatchBookingAPI() {
  console.log('\n🧪 TEST: Sistema de Reserva de Partidas (API)\n');
  console.log('='.repeat(60));

  try {
    // 1. Obtener usuario de prueba
    console.log('\n1️⃣ Obteniendo usuarios...');
    const usersRes = await fetch(`${BASE_URL}/api/users`);
    const users = await usersRes.json();
    
    const testUser = users.find(u => u.email === 'alex.garcia@email.com');
    if (!testUser) {
      console.log('❌ No se encontró el usuario de prueba');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${testUser.name}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Créditos iniciales: ${testUser.credits}`);
    
    const initialCredits = testUser.credits;

    // 2. Obtener partidas disponibles
    console.log('\n2️⃣ Buscando partidas disponibles...');
    const matchesRes = await fetch(`${BASE_URL}/api/matchgames?clubId=club-1`);
    const matchesData = await matchesRes.json();
    
    const availableMatch = matchesData.matchGames.find(m => 
      m.bookings.length < m.maxPlayers && 
      !m.bookings.some(b => b.userId === testUser.id)
    );

    if (!availableMatch) {
      console.log('❌ No hay partidas disponibles');
      return;
    }

    console.log(`✅ Partida encontrada: ${availableMatch.id}`);
    console.log(`   Precio: ${availableMatch.pricePerPlayer}€/jugador`);
    console.log(`   Jugadores: ${availableMatch.bookings.length}/${availableMatch.maxPlayers}`);
    console.log(`   Nivel: ${availableMatch.level || 'Abierta (0.0-7.0)'}`);

    // 3. Reservar plaza
    console.log('\n3️⃣ Reservando plaza...');
    const bookRes = await fetch(`${BASE_URL}/api/matchgames/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchGameId: availableMatch.id,
        userId: testUser.id
      })
    });

    if (!bookRes.ok) {
      const error = await bookRes.json();
      console.log(`❌ Error al reservar: ${error.error || bookRes.statusText}`);
      return;
    }

    const bookingData = await bookRes.json();
    console.log(`✅ Reserva creada: ${bookingData.booking.id}`);

    // 4. Verificar deducción de créditos
    console.log('\n4️⃣ Verificando deducción de créditos...');
    const userAfterRes = await fetch(`${BASE_URL}/api/users`);
    const usersAfter = await userAfterRes.json();
    const userAfter = usersAfter.find(u => u.id === testUser.id);

    const expectedCredits = initialCredits - availableMatch.pricePerPlayer;
    const actualCredits = userAfter.credits;

    if (actualCredits === expectedCredits) {
      console.log(`✅ Créditos deducidos correctamente`);
      console.log(`   Inicial: ${initialCredits} créditos`);
      console.log(`   Deducido: ${availableMatch.pricePerPlayer} créditos`);
      console.log(`   Final: ${actualCredits} créditos`);
    } else {
      console.log(`❌ Error en deducción de créditos`);
      console.log(`   Esperado: ${expectedCredits} créditos`);
      console.log(`   Real: ${actualCredits} créditos`);
      console.log(`   Diferencia: ${actualCredits - expectedCredits} créditos`);
    }

    // 5. Verificar estado de la partida
    console.log('\n5️⃣ Verificando estado de la partida...');
    const matchAfterRes = await fetch(`${BASE_URL}/api/matchgames?clubId=club-1`);
    const matchAfterData = await matchAfterRes.json();
    const matchAfter = matchAfterData.matchGames.find(m => m.id === availableMatch.id);

    console.log(`✅ Jugadores actuales: ${matchAfter.bookings.length}/${matchAfter.maxPlayers}`);
    
    if (matchAfter.bookings.length === matchAfter.maxPlayers) {
      console.log(`🎉 PARTIDA COMPLETA - Debería asignarse pista`);
      if (matchAfter.courtNumber) {
        console.log(`✅ Pista asignada: ${matchAfter.courtNumber}`);
      } else {
        console.log(`⚠️  Pista NO asignada (courtNumber: ${matchAfter.courtNumber})`);
      }
    }

    // 6. Cancelar reserva
    console.log('\n6️⃣ Cancelando reserva...');
    const cancelRes = await fetch(`${BASE_URL}/api/matchgames/${availableMatch.id}/leave`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUser.id })
    });

    if (!cancelRes.ok) {
      const error = await cancelRes.json();
      console.log(`❌ Error al cancelar: ${error.error || cancelRes.statusText}`);
      return;
    }

    console.log(`✅ Reserva cancelada`);

    // 7. Verificar devolución de créditos
    console.log('\n7️⃣ Verificando devolución de créditos...');
    const userFinalRes = await fetch(`${BASE_URL}/api/users`);
    const usersFinal = await userFinalRes.json();
    const userFinal = usersFinal.find(u => u.id === testUser.id);

    if (userFinal.credits === initialCredits) {
      console.log(`✅ Créditos devueltos correctamente`);
      console.log(`   Créditos finales: ${userFinal.credits} (igual que inicial)`);
    } else {
      console.log(`❌ Error en devolución de créditos`);
      console.log(`   Esperado: ${initialCredits} créditos`);
      console.log(`   Real: ${userFinal.credits} créditos`);
      console.log(`   Diferencia: ${userFinal.credits - initialCredits} créditos`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO\n');

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar test
testMatchBookingAPI();

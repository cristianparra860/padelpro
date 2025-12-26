// Test del flujo completo de reserva de partidas usando la API
const http = require('http');

const API_BASE = 'localhost:9002';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE.split(':')[0],
      port: API_BASE.split(':')[1],
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testMatchBookingAPI() {
  console.log('🎾 PRUEBA DE API - SISTEMA DE RESERVA DE PARTIDAS\n');
  console.log('============================================================\n');

  try {
    // 1. Buscar usuario de prueba
    console.log('📋 PASO 1: Obtener usuario de prueba...');
    const usersResponse = await makeRequest('/api/users');
    const testUser = usersResponse.data.find((u) => u.email === 'alex@example.com');
    
    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado');
      return;
    }
    
    console.log(`✅ Usuario: ${testUser.name}`);
    console.log(`   Créditos: ${testUser.credits}\n`);
    const creditosIniciales = testUser.credits;
    
    // 2. Buscar partidas disponibles
    console.log('📋 PASO 2: Buscar partidas disponibles...');
    const matchesResponse = await makeRequest('/api/matchgames');
    const availableMatches = matchesResponse.data.filter((m) => 
      m.courtNumber === null && // Sin pista asignada
      new Date(m.start) > new Date() // Futuras
    );
    
    if (availableMatches.length === 0) {
      console.log('❌ No hay partidas disponibles\n');
      return;
    }
    
    const match = availableMatches[0];
    console.log(`✅ Partida encontrada: ${match.id}`);
    console.log(`   Fecha: ${new Date(match.start).toLocaleString()}`);
    console.log(`   Precio: ${match.pricePerPlayer} créditos`);
    console.log(`   Jugadores actuales: ${match.bookings?.length || 0}/4\n`);
    
    // 3. Crear reserva usando la API
    console.log('📋 PASO 3: Crear reserva vía POST /api/matchgames/book...');
    
    const bookingResponse = await makeRequest('/api/matchgames/book', 'POST', {
      userId: testUser.id,
      matchGameId: match.id
    });
    
    if (bookingResponse.status !== 200) {
      console.log(`❌ Error al crear reserva: ${bookingResponse.status}`);
      console.log(JSON.stringify(bookingResponse.data, null, 2));
      return;
    }
    
    console.log(`✅ Respuesta API: ${bookingResponse.status}`);
    console.log(`   Booking ID: ${bookingResponse.data.bookingId}`);
    console.log(`   Estado: ${bookingResponse.data.booking?.status || 'PENDING'}\n`);
    
    // 4. Verificar descuento de créditos
    console.log('📋 PASO 4: Verificar descuento de créditos...');
    const usersAfterResponse = await makeRequest('/api/users');
    const userAfter = usersAfterResponse.data.find((u) => u.id === testUser.id);
    
    const diferencia = creditosIniciales - userAfter.credits;
    const bloqueadosDif = userAfter.blockedCredits - testUser.blockedCredits;
    console.log(`   Créditos antes: ${creditosIniciales}`);
    console.log(`   Créditos después: ${userAfter.credits}`);
    console.log(`   Bloqueados antes: ${testUser.blockedCredits}`);
    console.log(`   Bloqueados después: ${userAfter.blockedCredits}`);
    console.log(`   Diferencia total: ${diferencia}`);
    console.log(`   Diferencia bloqueados: ${bloqueadosDif}`);
    console.log(`   Esperado: ${match.pricePerPlayer * 100} céntimos\n`);
    
    if (bloqueadosDif === match.pricePerPlayer * 100) {
      console.log('✅ Créditos bloqueados correctamente\n');
    } else if (bloqueadosDif > 0) {
      console.log('⚠️ Créditos bloqueados pero cantidad diferente\n');
    } else {
      console.log('❌ No se bloquearon créditos\n');
    }
    
    // 5. Verificar que aparece en bookings del usuario
    console.log('📋 PASO 5: Verificar bookings del usuario...');
    const bookingsResponse = await makeRequest(`/api/users/${testUser.id}/match-bookings`);
    const userBookings = bookingsResponse.data.filter((b) => 
      b.matchGameId === match.id && 
      b.status !== 'CANCELLED'
    );
    
    if (userBookings.length > 0) {
      console.log(`✅ Reserva encontrada en bookings del usuario`);
      console.log(`   Booking ID: ${userBookings[0].id}`);
      console.log(`   Estado: ${userBookings[0].status}\n`);
      
      // 6. Cancelar reserva
      console.log('📋 PASO 6: Cancelar reserva vía DELETE...');
      
      const cancelResponse = await makeRequest(
        `/api/matchgames/${match.id}/leave`,
        'DELETE',
        { userId: testUser.id }
      );
      
      console.log(`✅ Reserva cancelada: ${cancelResponse.status}\n`);
      
      // 7. Verificar devolución de créditos
      console.log('📋 PASO 7: Verificar devolución de créditos...');
      const usersFinalResponse = await makeRequest('/api/users');
      const userFinal = usersFinalResponse.data.find((u) => u.id === testUser.id);
      
      console.log(`   Créditos iniciales: ${creditosIniciales}`);
      console.log(`   Créditos finales: ${userFinal.credits}`);
      console.log(`   Bloqueados finales: ${userFinal.blockedCredits}`);
      
      if (userFinal.credits === creditosIniciales && userFinal.blockedCredits === testUser.blockedCredits) {
        console.log('✅ Créditos devueltos completamente\n');
      } else {
        console.log(`⚠️ Diferencia: ${creditosIniciales - userFinal.credits} créditos totales\n`);
      }
      
    } else {
      console.log('❌ Reserva NO encontrada en bookings del usuario\n');
    }
    
    console.log('============================================================');
    console.log('🎉 PRUEBA DE API COMPLETADA');
    console.log('============================================================\n');
    
  } catch (error) {
    console.log('\n❌ ERROR EN LA PRUEBA:');
    console.log(error.message || error);
    if (error.stack) {
      console.log(error.stack);
    }
  }
}

// Ejecutar
testMatchBookingAPI().catch(console.error);

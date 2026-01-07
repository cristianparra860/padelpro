// Test de reserva de pista desde el panel del calendario del club
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9002';

async function testCourtReservation() {
  console.log('🎾 TEST: Reserva de pista desde calendario del club\n');
  
  try {
    // 1. Verificar que el endpoint existe
    console.log('1️⃣ Verificando endpoint de reservas de pista...');
    
    const testUser = {
      id: 'alex-garcia-id',
      name: 'Alex García',
      credits: 10000 // 100€ en céntimos
    };
    
    // Crear fecha de prueba (mañana a las 10:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + 60); // 60 minutos de duración
    
    const reservationData = {
      clubId: 'club-1',
      courtId: 'court-1', // Primera pista del club
      start: tomorrow.toISOString(),
      end: endTime.toISOString(),
      userId: testUser.id,
      duration: 60,
      totalPrice: 10, // 10€ por 1 hora
    };
    
    console.log('📋 Datos de la reserva:', {
      club: reservationData.clubId,
      pista: reservationData.courtId,
      inicio: tomorrow.toLocaleString('es-ES'),
      fin: endTime.toLocaleString('es-ES'),
      duración: `${reservationData.duration} minutos`,
      precio: `${reservationData.totalPrice}€`,
      usuario: testUser.name
    });
    
    console.log('\n2️⃣ Creando reserva de pista...');
    const response = await fetch(`${BASE_URL}/api/bookings/court-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationData),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Reserva creada exitosamente!');
      console.log('📊 Resultado:', result);
      console.log('\n✨ RESUMEN:');
      console.log(`   ID de reserva: ${result.reservation.id}`);
      console.log(`   Pista: ${result.reservation.courtId}`);
      console.log(`   Inicio: ${new Date(result.reservation.startTime).toLocaleString('es-ES')}`);
      console.log(`   Fin: ${new Date(result.reservation.endTime).toLocaleString('es-ES')}`);
      console.log(`   Duración: ${result.reservation.duration} minutos`);
      console.log(`   Precio: ${result.reservation.totalPrice}€`);
    } else {
      console.log('❌ Error al crear la reserva:', result.error);
      if (result.details) {
        console.log('   Detalles:', result.details);
      }
      if (result.requiredCredits) {
        console.log(`   Créditos necesarios: ${result.requiredCredits}€`);
        console.log(`   Créditos disponibles: ${result.availableCredits}€`);
      }
    }
    
    console.log('\n3️⃣ Verificando que la reserva aparece en el calendario...');
    const dateParam = tomorrow.toISOString().split('T')[0];
    const startDate = `${dateParam}T00:00:00.000Z`;
    const endDate = `${dateParam}T23:59:59.999Z`;
    
    const calendarResponse = await fetch(
      `${BASE_URL}/api/admin/calendar?clubId=club-1&startDate=${startDate}&endDate=${endDate}`
    );
    
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      
      // Buscar reservas de pista
      const courtReservations = calendarData.courtReservations || [];
      console.log(`   Reservas de pista encontradas: ${courtReservations.length}`);
      
      if (courtReservations.length > 0) {
        console.log('\n   📋 Reservas de pista en el calendario:');
        courtReservations.forEach((reservation, index) => {
          console.log(`   ${index + 1}. ${reservation.title}`);
          console.log(`      Pista ${reservation.courtNumber}`);
          console.log(`      ${new Date(reservation.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        });
      }
    }
    
    console.log('\n✅ TEST COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

// Ejecutar test
testCourtReservation();

// Script para probar la conversión de plaza a pago con puntos
// Este script simula el flujo completo del instructor activando una plaza

const fetch = require('node-fetch');

async function testCreditsSlotConversion() {
  console.log('🧪 TEST: Conversión de plaza a pago con puntos\n');
  
  // 1. Identificar la clase del 26/12/2025 a las 9:00
  const slotId = 'ts_1766512986806_eexnl3t7y';
  console.log(`📍 Slot objetivo: ${slotId}`);
  console.log(`📅 Fecha: 26/12/2025 9:00:00`);
  console.log(`👨‍🏫 Instructor: Carlos Rodriguez\n`);
  
  // 2. Estado actual
  console.log('📊 Estado ACTUAL en DB:');
  console.log('   creditsSlots: [1,2]');
  console.log('   -> Modalidad 1 jugador: ✅ Acepta puntos');
  console.log('   -> Modalidad 2 jugadores: ✅ Acepta puntos');
  console.log('   -> Modalidad 3 jugadores: ❌ Solo euros');
  console.log('   -> Modalidad 4 jugadores: ❌ Solo euros\n');
  
  // 3. Verificar endpoint
  console.log('🔧 TEST: Activar modalidad de 3 jugadores\n');
  
  const apiUrl = 'http://localhost:9002/api/timeslots/' + slotId + '/credits-slots';
  
  const payload = {
    slotIndex: 3, // groupSize = 3 (modalidad de 3 jugadores)
    action: 'add',
    creditsCost: 9, // Ejemplo: 25€ / 3 jugadores ≈ 9 puntos por persona
    instructorId: 'cmjhhs1lv000ltga4yl7vspkl' // Carlos Rodriguez
  };
  
  console.log('📤 Request:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ SUCCESS! Respuesta del API:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.creditsSlots) {
        console.log('\n📊 Nuevo estado en DB:');
        const creditsArray = JSON.parse(result.creditsSlots);
        console.log(`   creditsSlots: ${JSON.stringify(creditsArray)}`);
        console.log(`   -> Modalidad 1 jugador: ${creditsArray.includes(1) ? '✅' : '❌'} puntos`);
        console.log(`   -> Modalidad 2 jugadores: ${creditsArray.includes(2) ? '✅' : '❌'} puntos`);
        console.log(`   -> Modalidad 3 jugadores: ${creditsArray.includes(3) ? '✅' : '❌'} puntos`);
        console.log(`   -> Modalidad 4 jugadores: ${creditsArray.includes(4) ? '✅' : '❌'} puntos`);
      }
      
      console.log('\n💡 El frontend debería:');
      console.log('   1. Actualizar el estado local inmediatamente');
      console.log('   2. Mostrar TODOS los círculos de la modalidad 3 con borde verde/amarillo');
      console.log('   3. Llamar a onBookingSuccess() para refrescar desde el servidor');
      
    } else {
      const error = await response.text();
      console.log('\n❌ ERROR! Respuesta del API:');
      console.log(`Status: ${response.status}`);
      console.log(`Body: ${error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error de red:', error.message);
    console.log('\n💡 Asegúrate de que el servidor esté corriendo en http://localhost:9002');
  }
}

testCreditsSlotConversion();

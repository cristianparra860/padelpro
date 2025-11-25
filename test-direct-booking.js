async function testDirectBooking() {
  try {
    console.log('🧪 Probando reserva directa...');
    
    const bookingData = {
      timeSlotId: "cmi3bxmxr01q9tg549djco39l", // TimeSlot de prueba ABIERTO
      userId: "cmhkwi8so0001tggo0bwojrjy", // Alex Garcia
      groupSize: 1
    };
    
    console.log('📝 Enviando solicitud:', bookingData);
    
    const response = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });
    
    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    console.log('📋 Respuesta completa:', result);
    
    // Intentar parsear JSON si es posible
    try {
      const json = JSON.parse(result);
      console.log('\n💡 JSON parseado:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\n⚠️  La respuesta no es JSON válido');
    }
    
    if (response.ok) {
      console.log('\n✅ Reserva exitosa desde terminal');
    } else {
      console.log('\n❌ Error en la reserva desde terminal');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error);
  }
}

testDirectBooking();

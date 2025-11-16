// Test final: Verificar que el navegador recibirá los datos correctos
const fetch = require('node-fetch');

async function testBrowserPerspective() {
  console.log('🌐 SIMULANDO PETICIÓN DEL NAVEGADOR\n');
  
  try {
    const tomorrow = new Date('2025-11-10');
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const url = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}`;
    
    console.log(`📅 Fecha: ${dateStr}`);
    console.log(`🌐 URL: ${url}\n`);
    
    // Simular petición con headers del navegador
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      }
    });
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`📋 Headers:`);
    console.log(`   Cache-Control: ${response.headers.get('cache-control')}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}\n`);
    
    const data = await response.json();
    
    console.log(`📊 Total slots recibidos: ${data.length}\n`);
    
    if (data.length === 0) {
      console.log('❌ ERROR: No hay slots para mañana');
      return;
    }
    
    // Verificar que TODOS los slots tienen courtsAvailability
    const withCourtData = data.filter(s => s.courtsAvailability && s.courtsAvailability.length > 0);
    const withoutCourtData = data.filter(s => !s.courtsAvailability || s.courtsAvailability.length === 0);
    
    console.log('✅ VERIFICACIÓN DE DATOS:\n');
    console.log(`   Slots CON courtsAvailability: ${withCourtData.length}/${data.length}`);
    console.log(`   Slots SIN courtsAvailability: ${withoutCourtData.length}/${data.length}\n`);
    
    if (withoutCourtData.length > 0) {
      console.log('❌ PROBLEMA: Hay slots sin datos de pistas\n');
      console.log('Slots afectados:');
      withoutCourtData.slice(0, 5).forEach((slot, i) => {
        const start = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${start} | ${slot.instructorName} | courtId: ${slot.courtId}`);
      });
    } else {
      console.log('✅ PERFECTO: Todos los slots tienen courtsAvailability\n');
      
      // Mostrar ejemplo de lo que verá el componente
      const firstSlot = data[0];
      console.log('📋 EJEMPLO DE DATOS QUE RECIBE EL COMPONENTE:\n');
      console.log(`   Hora: ${new Date(firstSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   Instructor: ${firstSlot.instructorName}`);
      console.log(`   availableCourtsCount: ${firstSlot.availableCourtsCount}`);
      console.log(`   courtsAvailability: Array con ${firstSlot.courtsAvailability.length} pistas\n`);
      
      console.log('   Estado de cada pista:');
      firstSlot.courtsAvailability.forEach(court => {
        const emoji = court.status === 'available' ? '🟢' : '🔴';
        console.log(`   ${emoji} Pista ${court.courtNumber}: ${court.status.toUpperCase()}`);
      });
      
      console.log('\n✅ El componente DEBERÍA mostrar:');
      console.log('   "Estado de pistas (X disponibles):"');
      console.log('   [Indicadores visuales de las 4 pistas]');
      console.log('\n   NO debería mostrar: "Cargando disponibilidad..."');
    }
    
    // Test de renderizado condicional
    console.log('\n\n🔍 TEST DE LÓGICA DEL COMPONENTE:\n');
    const testSlot = data[0];
    
    console.log('   Condición: (classData as any).courtsAvailability');
    console.log(`   Resultado: ${testSlot.courtsAvailability ? 'VERDADERO' : 'FALSO'}`);
    
    console.log('\n   Condición: Array.isArray((classData as any).courtsAvailability)');
    console.log(`   Resultado: ${Array.isArray(testSlot.courtsAvailability) ? 'VERDADERO' : 'FALSO'}`);
    
    console.log('\n   Condición completa: courtsAvailability && Array.isArray()');
    console.log(`   Resultado: ${testSlot.courtsAvailability && Array.isArray(testSlot.courtsAvailability) ? 'VERDADERO ✅' : 'FALSO ❌'}`);
    
    if (testSlot.courtsAvailability && Array.isArray(testSlot.courtsAvailability)) {
      console.log('\n   ✅ La condición se cumple → Se mostrarán los indicadores');
      console.log('   ✅ NO se mostrará el mensaje "Cargando disponibilidad..."');
    } else {
      console.log('\n   ❌ La condición NO se cumple → Se mostrará "Cargando disponibilidad..."');
    }
    
    console.log('\n\n🎯 CONCLUSIÓN:');
    if (withCourtData.length === data.length && testSlot.courtsAvailability) {
      console.log('   ✅ Los datos están correctos en la API');
      console.log('   ✅ El componente debería funcionar correctamente');
      console.log('   💡 Si aún aparece "Cargando...", el problema es:');
      console.log('      1. Caché del navegador (hacer Ctrl+Shift+R)');
      console.log('      2. El servidor dev no se ha recargado (reiniciar npm run dev)');
      console.log('      3. La página está usando datos antiguos (abrir en incógnito)');
    } else {
      console.log('   ❌ Hay un problema con los datos de la API');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBrowserPerspective();

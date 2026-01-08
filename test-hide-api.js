// Test de endpoints para ocultar del historial
const fetch = require('node-fetch');

async function testHideEndpoints() {
  const baseUrl = 'http://localhost:9002';
  
  console.log('🧪 Probando endpoints de ocultar del historial\n');
  console.log('⚠️  NOTA: Estos endpoints requieren que el servidor dev esté corriendo\n');
  console.log('   Ejecuta: npm run dev\n\n');
  
  // Test 1: Ocultar reserva de clase
  const classBookingId = 'cmjmrveng000mtgd0a7blh6hf'; // Reserva pasada de Alex García
  
  console.log('1️⃣ Test: PATCH /api/bookings/[id]/hide (Clases)\n');
  console.log(`   Booking ID: ${classBookingId}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/bookings/${classBookingId}/hide`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('   Respuesta:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('   ✅ Reserva ocultada correctamente\n');
      
      // Verificar que se ocultó
      console.log('   Verificando en la base de datos...');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const booking = await prisma.booking.findUnique({
        where: { id: classBookingId },
        select: { hiddenFromHistory: true }
      });
      
      console.log(`   hiddenFromHistory: ${booking?.hiddenFromHistory ? '✅ true' : '❌ false'}\n`);
      
      await prisma.$disconnect();
    } else {
      console.log('   ❌ Error al ocultar reserva\n');
    }
    
  } catch (error) {
    console.error('   ❌ Error de conexión:', error.message);
    console.error('   Asegúrate de que el servidor dev esté corriendo en el puerto 9002\n');
  }
  
  // Test 2: Verificar que no aparece en el GET de bookings
  console.log('\n2️⃣ Test: GET /api/users/[userId]/bookings (debe excluir ocultas)\n');
  
  const userId = 'cmjmrvemm000gtgd0e78iid44'; // Alex García
  
  try {
    const response = await fetch(`${baseUrl}/api/users/${userId}/bookings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const bookings = await response.json();
    const hiddenBooking = bookings.find(b => b.id === classBookingId);
    
    if (hiddenBooking) {
      console.log('   ❌ ERROR: La reserva oculta todavía aparece en el listado');
    } else {
      console.log('   ✅ La reserva oculta NO aparece en el listado (correcto)');
    }
    
    console.log(`   Total bookings visibles: ${bookings.length}\n`);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n✅ Tests completados');
  console.log('\n💡 Para probar en el navegador:');
  console.log('   1. Abre http://localhost:9002');
  console.log('   2. Inicia sesión como Alex García');
  console.log('   3. Ve a "Mis Reservas" > pestaña "Pasadas"');
  console.log('   4. Click en botón "Eliminar" de una clase pasada');
  console.log('   5. La clase debe desaparecer del historial');
}

testHideEndpoints();

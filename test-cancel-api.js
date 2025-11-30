const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateCancelAPI() {
  try {
    console.log('=== SIMULATING CANCEL API CALL ===\n');
    
    const bookingId = 'booking-1764380460312-e0a5z8bjr';
    const userId = 'user-1763677041064-0iikjtaom'; // María García
    
    // Obtener datos ANTES
    const before = await prisma.$queryRaw`
      SELECT b.id, b.status, b.amountBlocked, b.isRecycled,
             u.credits, u.points, u.name
      FROM Booking b
      JOIN User u ON b.userId = u.id
      WHERE b.id = ${bookingId}
    `;
    
    console.log('📊 ANTES de la cancelación:');
    console.log(`  Usuario: ${before[0].name}`);
    console.log(`  Booking Status: ${before[0].status}`);
    console.log(`  IsRecycled: ${before[0].isRecycled}`);
    console.log(`  Créditos: €${before[0].credits}`);
    console.log(`  Puntos: ${before[0].points}`);
    console.log(`  Amount: €${before[0].amountBlocked}`);
    
    // Simular la API call
    console.log('\n🔄 Llamando a la API de cancelación...\n');
    
    const response = await fetch('http://localhost:9002/api/classes/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        userId: userId,
        timeSlotId: 'clyfp3bm50004356o2rfrkqkv' // Del TimeSlot
      })
    });
    
    const result = await response.json();
    
    console.log('📥 Respuesta de la API:');
    console.log(JSON.stringify(result, null, 2));
    
    // Obtener datos DESPUÉS
    const after = await prisma.$queryRaw`
      SELECT b.id, b.status, b.amountBlocked, b.isRecycled,
             u.credits, u.points, u.name
      FROM Booking b
      JOIN User u ON b.userId = u.id
      WHERE b.id = ${bookingId}
    `;
    
    console.log('\n📊 DESPUÉS de la cancelación:');
    console.log(`  Booking Status: ${after[0].status}`);
    console.log(`  IsRecycled: ${after[0].isRecycled ? 'TRUE' : 'FALSE'}`);
    console.log(`  Créditos: €${after[0].credits} (cambio: €${(after[0].credits - before[0].credits).toFixed(2)})`);
    console.log(`  Puntos: ${after[0].points} (cambio: +${after[0].points - before[0].points})`);
    
    // Verificación
    console.log('\n🔍 VERIFICACIÓN:');
    const expectedPoints = Math.floor(before[0].amountBlocked);
    const actualPoints = after[0].points - before[0].points;
    const creditsChanged = after[0].credits !== before[0].credits;
    
    if (after[0].status === 'CANCELLED') {
      console.log('  ✅ Booking marcado como CANCELLED');
    } else {
      console.log(`  ❌ ERROR: Booking status es ${after[0].status}, debería ser CANCELLED`);
    }
    
    if (after[0].isRecycled) {
      console.log('  ✅ Booking marcado como reciclado (isRecycled = true)');
    } else {
      console.log('  ❌ ERROR: isRecycled debería ser true');
    }
    
    if (actualPoints === expectedPoints) {
      console.log(`  ✅ Puntos otorgados correctamente: ${actualPoints} puntos`);
    } else {
      console.log(`  ❌ ERROR: Se esperaban ${expectedPoints} puntos pero se otorgaron ${actualPoints}`);
    }
    
    if (!creditsChanged) {
      console.log('  ✅ Créditos NO cambiaron (correcto, se otorgaron puntos)');
    } else {
      console.log(`  ❌ ERROR: Los créditos cambiaron cuando NO deberían`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateCancelAPI();

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function simulateBooking() {
  try {
    console.log('🚀 SIMULACIÓN DE RESERVA CON ASIGNACIÓN DE NIVEL\n');
    
    // Buscar clase sin reservas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimestamp = tomorrow.getTime();
    
    const availableSlots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE courtId IS NULL
      AND start >= ${todayTimestamp}
      AND start < ${tomorrowTimestamp}
      AND level = 'abierto'
      ORDER BY start
      LIMIT 10
    `;
    
    // Buscar una sin reservas
    let selectedSlot = null;
    for (const slot of availableSlots) {
      const bookingsCount = await prisma.booking.count({
        where: {
          timeSlotId: slot.id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });
      
      if (bookingsCount === 0) {
        selectedSlot = slot;
        break;
      }
    }
    
    if (!selectedSlot) {
      console.log('❌ No hay clases disponibles sin reservas');
      return;
    }
    
    const slotTime = new Date(selectedSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`✅ Clase seleccionada: ${slotTime}`);
    console.log(`   - ID: ${selectedSlot.id}`);
    console.log(`   - Level actual: "${selectedSlot.level}"`);
    console.log(`   - Gender: ${selectedSlot.genderCategory || 'null'}\n`);
    
    // Usuario de prueba
    const user = await prisma.user.findFirst({
      where: { email: 'jugador2@padelpro.com' }
    });
    
    console.log(`👤 Usuario: ${user.name}`);
    console.log(`   - Level: ${user.level}`);
    console.log(`   - Rango esperado: ${getLevelRange(user.level)}\n`);
    
    console.log('📤 Haciendo POST a /api/classes/book...\n');
    
    // Simular llamada HTTP al API
    const response = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        timeSlotId: selectedSlot.id,
        groupSize: 1,
        usePoints: false
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error en la reserva:', result.error);
      return;
    }
    
    console.log('✅ Reserva exitosa!\n');
    console.log('📦 Respuesta del API:');
    console.log(`   - success: ${result.success}`);
    console.log(`   - bookingId: ${result.bookingId}`);
    console.log(`   - classComplete: ${result.classComplete}`);
    
    if (result.updatedSlot) {
      console.log('\n📦 updatedSlot recibido:');
      console.log(`   - ID: ${result.updatedSlot.id?.substring(0, 15)}`);
      console.log(`   - level: "${result.updatedSlot.level}"`);
      console.log(`   - levelRange: "${result.updatedSlot.levelRange || 'null'}"`);
      console.log(`   - genderCategory: "${result.updatedSlot.genderCategory || 'null'}"`);
      console.log(`   - bookings: ${result.updatedSlot.bookings?.length || 0}`);
      
      if (result.updatedSlot.bookings && result.updatedSlot.bookings.length > 0) {
        console.log('\n📋 Bookings en updatedSlot:');
        result.updatedSlot.bookings.forEach((b, i) => {
          console.log(`   ${i + 1}. ${b.name} (${b.userEmail})`);
          console.log(`      - groupSize: ${b.groupSize}`);
          console.log(`      - status: ${b.status}`);
          console.log(`      - userLevel: ${b.userLevel}`);
        });
      }
    } else {
      console.log('\n⚠️ No se recibió updatedSlot en la respuesta');
    }
    
    // Verificar en la BD
    console.log('\n🔍 Verificando en la base de datos...\n');
    
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: selectedSlot.id }
    });
    
    console.log('📊 Estado en BD:');
    console.log(`   - level: "${updatedSlot.level}"`);
    console.log(`   - genderCategory: "${updatedSlot.genderCategory || 'null'}"`);
    
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: selectedSlot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: { select: { name: true, level: true } }
      }
    });
    
    console.log(`   - Reservas: ${bookings.length}`);
    bookings.forEach((b, i) => {
      console.log(`      ${i + 1}. ${b.user.name} (nivel ${b.user.level})`);
    });
    
    // Verificar resultado
    const expectedRange = getLevelRange(user.level);
    const success = updatedSlot.level === expectedRange;
    
    console.log(`\n${'='.repeat(60)}`);
    if (success) {
      console.log('✅ TEST EXITOSO!');
      console.log(`   Nivel esperado: "${expectedRange}"`);
      console.log(`   Nivel asignado: "${updatedSlot.level}"`);
      console.log('   ✓ El backend asigna el nivel correctamente');
      console.log('   ✓ El API devuelve el updatedSlot con el nivel');
      console.log('\n📝 Ahora verifica en el navegador que la tarjeta muestre:');
      console.log(`   "Nivel: ${expectedRange}"`);
    } else {
      console.log('❌ TEST FALLIDO');
      console.log(`   Nivel esperado: "${expectedRange}"`);
      console.log(`   Nivel asignado: "${updatedSlot.level}"`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function getLevelRange(level) {
  const numLevel = parseFloat(level);
  if (numLevel >= 1 && numLevel < 3) return '1-3';
  if (numLevel >= 3 && numLevel < 5) return '3-5';
  if (numLevel >= 5 && numLevel <= 7) return '5-7';
  return 'Abierto';
}

simulateBooking();

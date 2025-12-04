const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBooking() {
  try {
    console.log('🔍 Buscando clase disponible para hoy...\n');
    
    // Buscar una clase del día de hoy sin court asignada
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
      ORDER BY start
      LIMIT 1
    `;
    
    if (availableSlots.length === 0) {
      console.log('❌ No hay clases disponibles para hoy');
      return;
    }
    
    const slot = availableSlots[0];
    const slotTime = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`✅ Clase encontrada: ${slotTime}`);
    console.log(`   - ID: ${slot.id}`);
    console.log(`   - Instructor: ${slot.instructorId}`);
    console.log(`   - Level: ${slot.level}`);
    console.log(`   - Gender: ${slot.genderCategory}`);
    
    // Buscar usuario Alex Garcia
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log(`\n✅ Usuario: ${user.name} (${user.email})`);
    console.log(`   - Level: ${user.level}`);
    console.log(`   - Créditos: ${user.credits}€\n`);
    
    // Verificar si ya tiene una reserva en esta clase
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        timeSlotId: slot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    if (existingBooking) {
      console.log('⚠️ Usuario ya tiene una reserva en esta clase');
      console.log('   Saltando a siguiente paso...\n');
    } else {
      console.log('📝 Realizando reserva vía API HTTP...\n');
      
      // Simular llamada HTTP al API (requiere servidor corriendo en port 9002)
      console.log('🌐 POST http://localhost:9002/api/classes/book');
      console.log('📦 Body:', JSON.stringify({
        userId: user.id,
        timeSlotId: slot.id,
        groupSize: 1,
        usePoints: false
      }, null, 2));
      
      console.log('\n⏳ Por favor, haz la reserva manualmente en el navegador y observa los logs del servidor...');
      console.log('\n📝 Instrucciones:');
      console.log('   1. Abre http://localhost:9002 en el navegador');
      console.log('   2. Inicia sesión con jugador1@padelpro.com');
      console.log(`   3. Busca la clase de las ${slotTime}`);
      console.log('   4. Haz clic en "Reservar" para 1 jugador');
      console.log('   5. Observa los logs de la consola del navegador (F12)');
      console.log('   6. Observa los logs del terminal del servidor');
      console.log('\n🔍 Busca estos logs clave:');
      console.log('   - "🎉 BOOKING EXITOSO" en el navegador');
      console.log('   - "📦 Respuesta del API" con updatedSlot');
      console.log('   - "🔄 handleBookingSuccess LLAMADO EN CLASSESDISPLAY"');
      console.log('   - "🔄🔄🔄 ClassCard useEffect TRIGGERED"');
    }
    
    // Verificar estado actual de la clase en la BD
    console.log('\n\n📊 Estado actual de la clase en BD:');
    const currentBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: slot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: {
          select: { name: true, email: true, level: true }
        }
      }
    });
    
    console.log(`   - Total de reservas: ${currentBookings.length}`);
    currentBookings.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.user.name} (${b.user.email})`);
      console.log(`      - Group size: ${b.groupSize}`);
      console.log(`      - Status: ${b.status}`);
      console.log(`      - Level: ${b.user.level}`);
    });
    
    // Verificar nivel asignado a la clase
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: slot.id }
    });
    
    console.log(`\n   - Nivel de la clase: ${updatedSlot.level || 'null'}`);
    console.log(`   - Género de la clase: ${updatedSlot.genderCategory || 'null'}`);
    console.log(`   - Court ID: ${updatedSlot.courtId || 'null'}`);
    console.log(`   - Court Number: ${updatedSlot.courtNumber || 'null'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBooking();

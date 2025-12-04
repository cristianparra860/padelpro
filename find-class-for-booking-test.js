const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findClassWithoutBooking() {
  try {
    // Usuario Marc Parra
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log(`👤 Usuario: ${user.name} (${user.email})`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Level: ${user.level}`);
    console.log(`   - Créditos: ${user.credits}€\n`);
    
    // Buscar clases disponibles para hoy
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
    `;
    
    console.log(`📋 Clases disponibles hoy: ${availableSlots.length}\n`);
    
    // Buscar reservas existentes del usuario
    const userBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    const bookedSlotIds = userBookings.map(b => b.timeSlotId);
    console.log(`🎫 Usuario tiene ${userBookings.length} reservas activas\n`);
    
    // Filtrar clases sin reserva del usuario
    const slotsWithoutBooking = availableSlots.filter(slot => !bookedSlotIds.includes(slot.id));
    
    console.log(`✅ Clases donde el usuario NO tiene reserva: ${slotsWithoutBooking.length}\n`);
    
    if (slotsWithoutBooking.length === 0) {
      console.log('⚠️ Usuario ya tiene reservas en todas las clases disponibles hoy');
      return;
    }
    
    // Mostrar primeras 5 clases sin reserva
    console.log('📝 Primeras clases disponibles para reservar:\n');
    
    for (let i = 0; i < Math.min(5, slotsWithoutBooking.length); i++) {
      const slot = slotsWithoutBooking[i];
      const slotTime = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      // Contar reservas actuales
      const bookingsCount = await prisma.booking.count({
        where: {
          timeSlotId: slot.id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });
      
      // Obtener instructor
      const instructor = await prisma.instructor.findUnique({
        where: { id: slot.instructorId }
      });
      
      console.log(`${i + 1}. 🕐 ${slotTime} - Clase ${slot.id.substring(0,15)}...`);
      console.log(`   - Instructor: ${instructor?.name || 'N/A'}`);
      console.log(`   - Level: ${slot.level || 'abierto'}`);
      console.log(`   - Gender: ${slot.genderCategory || 'mixto'}`);
      console.log(`   - Reservas actuales: ${bookingsCount}`);
      console.log('');
    }
    
    console.log('\n📋 Para probar la actualización en tiempo real:');
    console.log('   1. Abre http://localhost:9002 en el navegador');
    console.log('   2. Inicia sesión con jugador1@padelpro.com');
    console.log('   3. Busca alguna de estas clases');
    console.log('   4. Haz clic en "Reservar"');
    console.log('   5. Observa la consola del navegador (F12) para ver los logs');
    console.log('\n🔍 Logs clave a observar:');
    console.log('   ✅ "🎉 BOOKING EXITOSO" → API respondió correctamente');
    console.log('   ✅ "📦 Respuesta del API" → updatedSlot recibido');
    console.log('   ✅ "🔄 handleBookingSuccess LLAMADO EN CLASSESDISPLAY" → Callback ejecutado');
    console.log('   ✅ "🔄🔄🔄 ClassCard useEffect TRIGGERED" → Component detectó el cambio');
    console.log('   ✅ "✅ setBookings llamado con X bookings" → Estado actualizado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findClassWithoutBooking();

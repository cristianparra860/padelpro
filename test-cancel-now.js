const fetch = require('node-fetch');

async function testCancelNow() {
  try {
    const userId = 'cmhkwi8so0001tggo0bwojrjy';
    
    // Obtener una reserva CONFIRMADA para probar
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const confirmedBooking = await prisma.booking.findFirst({
      where: {
        userId: userId,
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: {
          select: {
            id: true,
            start: true,
            courtNumber: true
          }
        }
      }
    });
    
    if (!confirmedBooking) {
      console.log('❌ No hay reservas confirmadas para probar');
      await prisma.$disconnect();
      return;
    }
    
    console.log('🧪 Probando cancelación vía API...\n');
    console.log('📋 Datos de la prueba:');
    console.log(`   User ID: ${userId}`);
    console.log(`   TimeSlot ID: ${confirmedBooking.timeSlotId}`);
    console.log(`   Booking ID: ${confirmedBooking.id}`);
    console.log(`   CourtNumber: ${confirmedBooking.timeSlot.courtNumber}`);
    console.log(`   Precio: ${confirmedBooking.amountBlocked / 100}€`);
    
    const slotTime = new Date(Number(confirmedBooking.timeSlot.start));
    console.log(`   Fecha clase: ${slotTime.toLocaleString('es-ES')}`);
    console.log('');
    
    console.log('⚠️  ESTA ES UNA PRUEBA REAL - VA A CANCELAR LA RESERVA\n');
    console.log('Esperando 3 segundos... (Ctrl+C para cancelar)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📤 Enviando petición POST a /api/classes/cancel...\n');
    
    const response = await fetch('http://localhost:9002/api/classes/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        timeSlotId: confirmedBooking.timeSlotId
      })
    });
    
    console.log(`📥 Respuesta recibida: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    console.log('📄 Contenido de la respuesta:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    if (response.ok) {
      console.log('✅ Cancelación exitosa!');
      console.log(`💰 Puntos otorgados: ${data.pointsGranted || 0}`);
      
      // Verificar puntos actuales
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true }
      });
      
      console.log(`📊 Puntos actuales: ${user?.points || 0}`);
    } else {
      console.log('❌ Error en la cancelación:');
      console.log(`   ${data.error || 'Error desconocido'}`);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testCancelNow();

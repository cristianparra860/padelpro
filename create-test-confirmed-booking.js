const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestClass() {
  try {
    const userId = 'user-1763677035576-wv1t7iun0';
    const clubId = 'padel-estrella-madrid';
    const instructorId = 'cmhkwmdc10005tgqw6fn129he'; // ID real del instructor
    
    // Buscar una cancha disponible
    const court = await prisma.court.findFirst({
      where: { clubId }
    });
    
    if (!court) {
      console.log('❌ No se encontró ninguna cancha');
      return;
    }
    
    // Crear TimeSlot CONFIRMADO (con courtId ya asignado)
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Mañana
    startTime.setHours(10, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(11, 30, 0, 0);
    
    const timeSlot = await prisma.timeSlot.create({
      data: {
        clubId,
        instructorId,
        start: startTime, // Date object
        end: endTime, // Date object
        totalPrice: 10,
        level: 'intermedio',
        category: 'mixto',
        courtId: court.id, // ← COURT YA ASIGNADO = CLASE CONFIRMADA
        courtNumber: court.courtNumber,
        hasRecycledSlots: false
      }
    });
    
    console.log('✅ TimeSlot creado:', timeSlot.id);
    console.log(`   Fecha: ${startTime.toLocaleString()}`);
    console.log(`   Court: ${court.courtNumber}`);
    console.log(`   Precio: €${timeSlot.totalPrice}`);
    
    // Crear booking CONFIRMED para el usuario
    const booking = await prisma.booking.create({
      data: {
        userId,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        amountBlocked: 10,
        status: 'CONFIRMED', // ← STATUS CONFIRMED
        isRecycled: false
      }
    });
    
    console.log('\n✅ Booking CONFIRMED creado:', booking.id);
    console.log(`   Usuario: Marc Parra`);
    console.log(`   Amount: €${booking.amountBlocked}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Court: ${court.courtNumber}`);
    
    // Actualizar créditos bloqueados (ya se cobró)
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: 10 },
        blockedCredits: { decrement: 0 } // No hay nada bloqueado, ya se cobró
      }
    });
    
    console.log('\n💰 Créditos actualizados: -€10 (ya cobrado)');
    
    // Crear transacciones
    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit',
        action: 'subtract',
        amount: 10,
        balance: 1444, // Tu saldo actual (1454) - 10
        concept: `Clase confirmada - ${startTime.toLocaleDateString()}`,
        relatedId: booking.id,
        relatedType: 'booking'
      }
    });
    
    console.log('✅ Transacción de pago registrada');
    
    console.log('\n🎯 CLASE DE PRUEBA CREADA EXITOSAMENTE');
    console.log('─────────────────────────────────────────');
    console.log('📍 Para probar la cancelación:');
    console.log('   1. Ve a "Mis Reservas" en el dashboard');
    console.log('   2. Busca la clase de mañana a las 10:00');
    console.log('   3. Haz clic en "Cancelar" (NO uses el botón de admin)');
    console.log('   4. Deberías recibir 10 PUNTOS (no dinero)');
    console.log('   5. Verifica en el panel de puntos que aparece la transacción');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestClass();

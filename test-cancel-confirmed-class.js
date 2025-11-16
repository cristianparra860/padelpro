// test-cancel-confirmed-class.js
// Script para probar la cancelación de una clase confirmada y verificar los puntos

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancelConfirmedClass() {
  console.log('\n🧪 TEST: Cancelación de clase confirmada con devolución de puntos\n');
  console.log('=' .repeat(80));

  try {
    // 1. Buscar un usuario
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });

    if (!user) {
      console.log('❌ No se encontró el usuario de prueba');
      return;
    }

    console.log(`\n✅ Usuario encontrado: ${user.name} (${user.email})`);
    console.log(`   💰 Créditos: €${(user.credits / 100).toFixed(2)}`);
    console.log(`   🌟 Puntos ANTES: ${user.points}`);

    // 2. Buscar una clase confirmada (con courtNumber asignado)
    const confirmedSlot = await prisma.timeSlot.findFirst({
      where: {
        courtNumber: { not: null },
        start: { gte: new Date() }
      },
      include: {
        bookings: {
          where: {
            userId: user.id,
            status: 'CONFIRMED'
          }
        }
      }
    });

    if (!confirmedSlot || confirmedSlot.bookings.length === 0) {
      console.log('\n⚠️  No se encontró una reserva confirmada para cancelar');
      console.log('   Creando una clase confirmada de prueba...');
      
      // Crear una clase confirmada de prueba
      const testSlot = await prisma.timeSlot.create({
        data: {
          clubId: 'padel-estrella-madrid',
          instructorId: 'cmhkwmdc10005tgqw6fn129he',
          start: new Date(Date.now() + 86400000), // Mañana
          end: new Date(Date.now() + 90000000), // Mañana + 1 hora
          maxPlayers: 4,
          totalPrice: 2500, // 25€
          instructorPrice: 1500,
          courtRentalPrice: 1000,
          level: 'ABIERTO',
          category: 'ABIERTO',
          courtId: 'cmhkwerqw0000tg1gqw0v944d',
          courtNumber: 1
        }
      });

      const testBooking = await prisma.booking.create({
        data: {
          userId: user.id,
          timeSlotId: testSlot.id,
          groupSize: 4,
          status: 'CONFIRMED',
          amountBlocked: 625 // 6.25€ (25€ / 4 jugadores)
        }
      });

      console.log(`   ✅ Clase de prueba creada: ${testSlot.id}`);
      console.log(`   ✅ Reserva de prueba creada: ${testBooking.id}`);
      console.log(`   💰 Precio por jugador: €${(testBooking.amountBlocked / 100).toFixed(2)}`);
      
      return {
        userId: user.id,
        timeSlotId: testSlot.id,
        bookingId: testBooking.id,
        amountBlocked: testBooking.amountBlocked
      };
    }

    const booking = confirmedSlot.bookings[0];
    
    console.log(`\n📍 Clase confirmada encontrada:`);
    console.log(`   🆔 TimeSlot: ${confirmedSlot.id}`);
    console.log(`   🏟️  Pista: ${confirmedSlot.courtNumber}`);
    console.log(`   📅 Inicio: ${new Date(confirmedSlot.start).toLocaleString('es-ES')}`);
    console.log(`   💰 Precio total: €${(confirmedSlot.totalPrice / 100).toFixed(2)}`);
    console.log(`\n📍 Reserva del usuario:`);
    console.log(`   🆔 Booking: ${booking.id}`);
    console.log(`   👥 Grupo: ${booking.groupSize} jugadores`);
    console.log(`   💰 Monto pagado: €${(booking.amountBlocked / 100).toFixed(2)}`);
    console.log(`   🎁 Puntos a devolver: ${Math.floor(booking.amountBlocked / 100)} puntos`);

    return {
      userId: user.id,
      timeSlotId: confirmedSlot.id,
      bookingId: booking.id,
      amountBlocked: booking.amountBlocked
    };

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyPointsTransaction(userId, bookingId) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICANDO REGISTRO DE TRANSACCIÓN DE PUNTOS');
  console.log('='.repeat(80));

  try {
    // Buscar la transacción de puntos
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        type: 'points',
        action: 'add',
        relatedId: bookingId,
        relatedType: 'booking'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (transaction) {
      console.log('\n✅ Transacción de puntos encontrada:');
      console.log(`   🆔 ID: ${transaction.id}`);
      console.log(`   💎 Tipo: ${transaction.type}`);
      console.log(`   📝 Acción: ${transaction.action}`);
      console.log(`   💰 Cantidad: ${transaction.amount} puntos`);
      console.log(`   💼 Balance después: ${transaction.balance} puntos`);
      console.log(`   📄 Concepto: ${transaction.concept}`);
      console.log(`   📅 Fecha: ${new Date(transaction.createdAt).toLocaleString('es-ES')}`);
      
      if (transaction.metadata) {
        const metadata = JSON.parse(transaction.metadata);
        console.log(`   📋 Metadata:`);
        console.log(`      - Status: ${metadata.status}`);
        console.log(`      - Razón: ${metadata.reason}`);
        console.log(`      - Monto original: €${(metadata.originalAmount / 100).toFixed(2)}`);
      }
    } else {
      console.log('\n❌ No se encontró la transacción de puntos');
    }

    // Verificar el usuario actualizado
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, points: true, credits: true }
    });

    if (user) {
      console.log(`\n✅ Usuario actualizado:`);
      console.log(`   👤 Nombre: ${user.name}`);
      console.log(`   🌟 Puntos DESPUÉS: ${user.points}`);
      console.log(`   💰 Créditos: €${(user.credits / 100).toFixed(2)}`);
    }

  } catch (error) {
    console.error('\n❌ Error verificando transacción:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test
testCancelConfirmedClass().then(async (testData) => {
  if (testData) {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 Para cancelar esta clase y probar el sistema, ejecuta:');
    console.log('='.repeat(80));
    console.log(`
curl -X POST http://localhost:9002/api/classes/cancel \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "${testData.userId}",
    "timeSlotId": "${testData.timeSlotId}",
    "bookingId": "${testData.bookingId}"
  }'
`);
    console.log('\nO copia este comando PowerShell:');
    console.log(`
$body = @{
    userId = "${testData.userId}"
    timeSlotId = "${testData.timeSlotId}"
    bookingId = "${testData.bookingId}"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9002/api/classes/cancel" -Method Post -Body $body -ContentType "application/json"
`);
    
    console.log('\n💡 Después de cancelar, ejecuta este comando para verificar:');
    console.log(`node -e "const test = require('./test-cancel-confirmed-class.js'); test.verifyPointsTransaction('${testData.userId}', '${testData.bookingId}')"`);
  }
});

module.exports = { verifyPointsTransaction };

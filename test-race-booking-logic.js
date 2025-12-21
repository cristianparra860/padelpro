// Probar el sistema de race booking con múltiples inscripciones
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRaceBooking() {
  try {
    console.log('🧪 Prueba del sistema de race booking\n');
    
    // Buscar un usuario con bookings pendientes
    const users = await prisma.user.findMany({
      where: {
        bookings: {
          some: {
            status: 'PENDING',
            timeSlot: {
              courtId: null // Sin pista asignada
            }
          }
        }
      },
      include: {
        bookings: {
          where: {
            status: 'PENDING',
            timeSlot: {
              courtId: null
            }
          },
          include: {
            timeSlot: {
              select: {
                start: true,
                totalPrice: true
              }
            }
          }
        }
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios con bookings pendientes sin pista asignada');
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuarios con bookings pendientes\n`);
    
    for (const user of users) {
      console.log(`\n👤 Usuario: ${user.name} (${user.email})`);
      console.log(`   💳 Credits: ${user.credits} céntimos (€${(user.credits/100).toFixed(2)})`);
      console.log(`   🔒 Blocked: ${user.blockedCredits} céntimos (€${(user.blockedCredits/100).toFixed(2)})`);
      console.log(`   💰 Disponible: ${user.credits - user.blockedCredits} céntimos (€${((user.credits - user.blockedCredits)/100).toFixed(2)})`);
      console.log(`   📚 Bookings pendientes: ${user.bookings.length}\n`);
      
      // Mostrar detalles de cada booking
      user.bookings.forEach((booking, idx) => {
        const slotDate = new Date(booking.timeSlot.start).toLocaleString('es-ES');
        const slotPrice = booking.timeSlot.totalPrice;
        const pricePerPlayer = slotPrice / booking.groupSize;
        
        console.log(`   [${idx + 1}] ${slotDate}`);
        console.log(`       👥 Group size: ${booking.groupSize} jugadores`);
        console.log(`       💰 Precio slot: €${(slotPrice/100).toFixed(2)}`);
        console.log(`       💵 Precio por jugador: €${(pricePerPlayer/100).toFixed(2)}`);
        console.log(`       🔒 Amount blocked: ${booking.amountBlocked} céntimos (€${(booking.amountBlocked/100).toFixed(2)})`);
      });
      
      // Calcular el máximo que DEBERÍA estar bloqueado
      const maxBlocked = Math.max(...user.bookings.map(b => b.amountBlocked));
      console.log(`\n   📌 MÁXIMO amountBlocked: ${maxBlocked} céntimos (€${(maxBlocked/100).toFixed(2)})`);
      console.log(`   ${user.blockedCredits === maxBlocked ? '✅' : '❌'} Blocked credits en User: ${user.blockedCredits} céntimos (€${(user.blockedCredits/100).toFixed(2)})`);
      
      if (user.blockedCredits !== maxBlocked) {
        console.log(`   ⚠️ DISCREPANCIA DETECTADA!`);
        console.log(`      Se esperaba: ${maxBlocked} céntimos`);
        console.log(`      Se encontró: ${user.blockedCredits} céntimos`);
      } else {
        console.log(`   ✅ CORRECTO: Sistema bloqueó el valor más alto de todas las inscripciones`);
      }
    }
    
    console.log('\n\n📝 CONCLUSIÓN:');
    const allCorrect = users.every(user => {
      const maxBlocked = Math.max(...user.bookings.map(b => b.amountBlocked));
      return user.blockedCredits === maxBlocked;
    });
    
    if (allCorrect) {
      console.log('✅ Todos los usuarios tienen el blockedCredits correcto');
      console.log('✅ El sistema está bloqueando correctamente el valor más alto de todas las inscripciones');
    } else {
      console.log('❌ Hay usuarios con blockedCredits incorrecto');
      console.log('⚠️ Se necesita ejecutar updateUserBlockedCredits() para cada usuario afectado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRaceBooking();

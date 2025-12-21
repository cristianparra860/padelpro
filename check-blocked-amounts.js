// Verificar los montos bloqueados en las bookings
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlockedAmounts() {
  try {
    console.log('📊 Verificando montos bloqueados en Bookings...\n');
    
    // Obtener todas las bookings pendientes
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            credits: true,
            blockedCredits: true
          }
        },
        timeSlot: {
          select: {
            start: true,
            totalPrice: true,
            courtId: true
          }
        }
      }
    });
    
    console.log(`Total bookings PENDING: ${pendingBookings.length}\n`);
    
    // Agrupar por usuario
    const byUser = {};
    pendingBookings.forEach(booking => {
      const userId = booking.userId;
      if (!byUser[userId]) {
        byUser[userId] = {
          user: booking.user,
          bookings: []
        };
      }
      byUser[userId].bookings.push(booking);
    });
    
    // Mostrar información detallada por usuario
    for (const [userId, data] of Object.entries(byUser)) {
      console.log(`\n👤 Usuario: ${data.user.name} (${data.user.email})`);
      console.log(`   💳 Credits: ${data.user.credits} céntimos (€${(data.user.credits/100).toFixed(2)})`);
      console.log(`   🔒 Blocked: ${data.user.blockedCredits} céntimos (€${(data.user.blockedCredits/100).toFixed(2)})`);
      console.log(`   📚 Bookings pendientes: ${data.bookings.length}`);
      
      data.bookings.forEach((booking, idx) => {
        const slotDate = new Date(booking.timeSlot.start).toLocaleString('es-ES');
        console.log(`\n   [${idx + 1}] Booking ID: ${booking.id}`);
        console.log(`       📅 Fecha: ${slotDate}`);
        console.log(`       👥 Group size: ${booking.groupSize}`);
        console.log(`       💰 TimeSlot totalPrice: ${booking.timeSlot.totalPrice} céntimos (€${(booking.timeSlot.totalPrice/100).toFixed(2)})`);
        console.log(`       🔒 Amount blocked: ${booking.amountBlocked} ${booking.amountBlocked > 100 ? 'céntimos' : 'POSIBLE ERROR - debería ser céntimos'} (€${(booking.amountBlocked/100).toFixed(2)})`);
        console.log(`       🏟️ Court assigned: ${booking.timeSlot.courtId ? 'SÍ (' + booking.timeSlot.courtId + ')' : 'NO (race mode)'}`);
        console.log(`       💳 Paid with points: ${booking.paidWithPoints ? 'SÍ' : 'NO'}`);
      });
      
      // Calcular el máximo que DEBERÍA estar bloqueado
      const maxAmountBlocked = Math.max(...data.bookings.map(b => b.amountBlocked));
      console.log(`\n   ✅ Máximo bloqueado (debería ser): ${maxAmountBlocked} céntimos (€${(maxAmountBlocked/100).toFixed(2)})`);
      console.log(`   ${data.user.blockedCredits === maxAmountBlocked ? '✅' : '❌'} Blocked credits actual: ${data.user.blockedCredits} céntimos`);
      
      if (data.user.blockedCredits !== maxAmountBlocked) {
        console.log(`   ⚠️ DISCREPANCIA: Se esperaba ${maxAmountBlocked} pero hay ${data.user.blockedCredits}`);
      }
    }
    
    console.log('\n\n📋 RESUMEN DE PROBLEMAS:\n');
    
    // Detectar bookings con valores en euros en lugar de céntimos
    const problematicBookings = pendingBookings.filter(b => b.amountBlocked > 0 && b.amountBlocked < 100);
    if (problematicBookings.length > 0) {
      console.log(`❌ ${problematicBookings.length} bookings con amountBlocked < 100 (posiblemente en euros en lugar de céntimos):`);
      problematicBookings.forEach(b => {
        console.log(`   - Booking ${b.id}: amountBlocked = ${b.amountBlocked} (debería ser ~${b.amountBlocked * 100})`);
      });
    } else {
      console.log(`✅ Todas las bookings tienen amountBlocked >= 100 (formato correcto en céntimos)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlockedAmounts();

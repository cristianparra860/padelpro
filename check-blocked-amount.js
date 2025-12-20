// check-blocked-amount.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlockedAmount() {
  try {
    // Usuario actual (Marc Parra / jugador1@padelpro.com)
    const userId = 'user-1763677035576-wv1t7iun0';
    
    console.log('🔍 Verificando bloqueo de créditos...\n');
    
    // Ver el blockedCredits del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        credits: true, 
        blockedCredits: true 
      }
    });
    
    console.log('👤 Usuario:', user.email);
    console.log('💰 Créditos totales:', user.credits, '€');
    console.log('🔒 Bloqueados:', user.blockedCredits, '€');
    console.log('✅ Disponibles:', (user.credits - user.blockedCredits), '€\n');
    
    // Ver todas las inscripciones PENDING sin pista asignada
    const pendingBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'PENDING',
        timeSlot: {
          courtId: null
        }
      },
      select: {
        id: true,
        amountBlocked: true,
        paidWithPoints: true,
        timeSlot: {
          select: {
            start: true,
            level: true,
            genderCategory: true
          }
        }
      },
      orderBy: {
        timeSlot: { start: 'asc' }
      }
    });
    
    console.log('📋 Inscripciones PENDING (sin pista asignada):', pendingBookings.length);
    
    if (pendingBookings.length > 0) {
      console.log('\n💳 Detalle de inscripciones:\n');
      
      pendingBookings.forEach((booking, i) => {
        const date = new Date(booking.timeSlot.start);
        const dateStr = date.toLocaleDateString('es-ES');
        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const paymentMethod = booking.paidWithPoints ? 'PUNTOS' : 'CRÉDITOS';
        
        console.log(`${i + 1}. ${dateStr} ${timeStr}`);
        console.log(`   Nivel: ${booking.timeSlot.level} | Género: ${booking.timeSlot.genderCategory}`);
        console.log(`   Bloqueado: ${booking.amountBlocked}€ | Método: ${paymentMethod}`);
        console.log(`   ID: ${booking.id}`);
        console.log('');
      });
      
      // Encontrar el monto más alto
      const amounts = pendingBookings.map(b => b.amountBlocked);
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      const totalSum = amounts.reduce((sum, a) => sum + a, 0);
      
      console.log('📊 Resumen de montos bloqueados:');
      console.log('   Mínimo:', minAmount, '€');
      console.log('   Máximo:', maxAmount, '€');
      console.log('   Suma total:', totalSum, '€');
      console.log('   Promedio:', (totalSum / amounts.length).toFixed(2), '€');
      console.log('\n⚠️  Debería estar bloqueado solo el MÁXIMO:', maxAmount, '€');
      console.log('❌ Pero está bloqueado:', user.blockedCredits, '€');
      
      if (user.blockedCredits !== maxAmount) {
        console.log('\n🚨 INCONSISTENCIA DETECTADA!');
        console.log('   Diferencia:', (user.blockedCredits - maxAmount), '€');
      }
    } else {
      console.log('✅ No hay inscripciones pendientes sin pista');
      if (user.blockedCredits > 0) {
        console.log('⚠️  Pero blockedCredits es:', user.blockedCredits, '€ (debería ser 0)');
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkBlockedAmount();

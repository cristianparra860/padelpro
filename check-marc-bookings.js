// Verificar bookings y blocked credits de Marc
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcBookings() {
  try {
    console.log('📊 Verificando bookings de Marc Parra...\n');
    
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    if (!marc) {
      console.log('❌ Marc no encontrado');
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name} (${marc.email})`);
    console.log(`   💳 Credits: ${marc.credits} céntimos (€${(marc.credits/100).toFixed(2)})`);
    console.log(`   🔒 Blocked: ${marc.blockedCredits} céntimos (€${(marc.blockedCredits/100).toFixed(2)})\n`);
    
    // Obtener bookings PENDING sin courtId
    const pendingBookings = await prisma.booking.findMany({
      where: {
        userId: marc.id,
        status: 'PENDING',
        timeSlot: {
          courtId: null
        }
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            totalPrice: true,
            courtId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📚 Bookings PENDING sin pista asignada: ${pendingBookings.length}\n`);
    
    if (pendingBookings.length === 0) {
      console.log('✅ No hay bookings pendientes sin pista');
      return;
    }
    
    // Mostrar detalles
    pendingBookings.forEach((booking, idx) => {
      const date = new Date(booking.timeSlot.start).toLocaleString('es-ES');
      console.log(`[${idx + 1}] Booking ID: ${booking.id}`);
      console.log(`    Fecha: ${date}`);
      console.log(`    Group size: ${booking.groupSize}`);
      console.log(`    TimeSlot totalPrice: ${booking.timeSlot.totalPrice} céntimos (€${(booking.timeSlot.totalPrice/100).toFixed(2)})`);
      console.log(`    Amount blocked: ${booking.amountBlocked} céntimos (€${(booking.amountBlocked/100).toFixed(2)})`);
      console.log(`    Court ID: ${booking.timeSlot.courtId || 'NULL (sin asignar)'}`);
      console.log('');
    });
    
    // Calcular el máximo
    const maxBlocked = Math.max(...pendingBookings.map(b => b.amountBlocked));
    console.log(`\n📌 MÁXIMO amountBlocked: ${maxBlocked} céntimos (€${(maxBlocked/100).toFixed(2)})`);
    console.log(`🔒 User blockedCredits actual: ${marc.blockedCredits} céntimos (€${(marc.blockedCredits/100).toFixed(2)})`);
    
    if (marc.blockedCredits !== maxBlocked) {
      console.log(`\n⚠️ DISCREPANCIA DETECTADA!`);
      console.log(`   Debería ser: ${maxBlocked} céntimos (€${(maxBlocked/100).toFixed(2)})`);
      console.log(`   Pero es: ${marc.blockedCredits} céntimos (€${(marc.blockedCredits/100).toFixed(2)})`);
      console.log(`\n🔧 Ejecutando updateUserBlockedCredits...`);
      
      await prisma.user.update({
        where: { id: marc.id },
        data: { blockedCredits: maxBlocked }
      });
      
      console.log(`✅ blockedCredits actualizado a ${maxBlocked} céntimos (€${(maxBlocked/100).toFixed(2)})`);
    } else {
      console.log(`\n✅ blockedCredits es correcto!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarcBookings();

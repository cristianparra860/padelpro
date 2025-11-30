const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBlockingSystem() {
  try {
    console.log('\n🔐 PROBANDO SISTEMA DE BLOQUEO\n');
    
    // Obtener usuario Marc
    const marc = await prisma.user.findFirst({
      where: { email: { contains: 'jugador1' } }
    });
    
    if (!marc) {
      console.log('❌ Usuario Marc no encontrado');
      return;
    }
    
    console.log(`✅ Usuario: ${marc.name} (${marc.id})\n`);
    
    // Verificar reservas confirmadas de hoy
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log(`📅 Fecha: ${startOfDay.toLocaleDateString('es-ES')}\n`);
    
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        userId: marc.id,
        status: 'CONFIRMED',
        timeSlot: {
          start: {
            gte: startOfDay,
            lte: endOfDay
          },
          courtId: { not: null }
        }
      },
      include: {
        timeSlot: {
          include: {
            court: { select: { number: true } },
            instructor: { include: { user: { select: { name: true } } } }
          }
        }
      }
    });
    
    console.log(`🎯 Reservas CONFIRMADAS hoy: ${confirmedBookings.length}\n`);
    
    if (confirmedBookings.length > 0) {
      console.log('✅ BLOQUEO ACTIVADO - El usuario tiene estas reservas confirmadas:\n');
      confirmedBookings.forEach((b, i) => {
        const time = new Date(b.timeSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`${i + 1}. ${time} - Pista ${b.timeSlot.court?.number} - ${b.timeSlot.instructor?.user?.name}`);
        console.log(`   Estado: ${b.status}`);
        console.log(`   Grupo: ${b.groupSize} jugadores\n`);
      });
      
      console.log('🔒 Las tarjetas de clase para HOY deberían mostrar:');
      console.log('   - Mensaje rojo de bloqueo');
      console.log('   - Botones deshabilitados y grises');
      console.log('   - Toast de error al intentar reservar\n');
    } else {
      console.log('⚠️ BLOQUEO NO ACTIVO - El usuario NO tiene reservas confirmadas hoy');
      console.log('   Las tarjetas funcionarán normalmente\n');
    }
    
    // Verificar reservas pendientes
    const pendingBookings = await prisma.booking.findMany({
      where: {
        userId: marc.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        timeSlot: {
          start: {
            gte: startOfDay,
            lte: endOfDay
          },
          courtId: null
        }
      },
      include: {
        timeSlot: {
          include: {
            instructor: { include: { user: { select: { name: true } } } }
          }
        }
      }
    });
    
    console.log(`🟠 Inscripciones en PROPUESTAS (sin pista): ${pendingBookings.length}\n`);
    
    if (pendingBookings.length > 0) {
      console.log('Propuestas donde está inscrito:\n');
      pendingBookings.forEach((b, i) => {
        const time = new Date(b.timeSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`${i + 1}. ${time} - ${b.timeSlot.instructor?.user?.name} - Grupo ${b.groupSize}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBlockingSystem();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingBookings() {
  const userId = 'user-1763677035576-wv1t7iun0';
  
  console.log('\n🔍 INSPECCIÓN DE INSCRIPCIONES PENDIENTES\n');
  console.log('Usuario:', userId);
  console.log('Email: jugador1@padelpro.com');
  console.log('Nombre: Marc Parra\n');

  // 1. Obtener datos del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      blockedCredits: true,
    }
  });

  console.log('💰 SALDO USUARIO:');
  console.log('  Total credits:', user.credits + '€');
  console.log('  Blocked credits:', user.blockedCredits + '€');
  console.log('  Disponible:', (user.credits - user.blockedCredits) + '€\n');

  // 2. Buscar todas las inscripciones PENDING sin pista
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId: userId,
      status: 'PENDING',
      timeSlot: {
        courtId: null
      }
    },
    include: {
      timeSlot: {
        include: {
          club: true,
          instructor: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('📋 INSCRIPCIONES PENDIENTES (sin pista asignada):');
  console.log('Total encontradas:', pendingBookings.length + '\n');

  if (pendingBookings.length === 0) {
    console.log('❌ No hay inscripciones PENDING sin pista asignada');
    console.log('⚠️  INCONSISTENCIA: blockedCredits = ' + user.blockedCredits + '€ pero no hay inscripciones que lo justifiquen\n');
  } else {
    const amounts = [];
    
    pendingBookings.forEach((booking, index) => {
      const start = new Date(Number(booking.timeSlot.start));
      const instructor = booking.timeSlot.instructor?.name || 'Sin instructor';
      
      console.log(`\n📌 Inscripción ${index + 1}:`);
      console.log('  ID:', booking.id);
      console.log('  Fecha:', start.toLocaleDateString('es-ES'));
      console.log('  Hora:', start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      console.log('  Club:', booking.timeSlot.club.name);
      console.log('  Instructor:', instructor);
      console.log('  Nivel:', booking.timeSlot.level || 'N/A');
      console.log('  Género:', booking.timeSlot.genderCategory || 'N/A');
      console.log('  💶 Amount Blocked:', booking.amountBlocked + '€');
      console.log('  Método pago:', booking.paymentMethod);
      console.log('  Estado:', booking.status);
      console.log('  Tamaño grupo:', booking.groupSize);
      
      amounts.push(booking.amountBlocked || 0);
    });

    // Calcular estadísticas
    console.log('\n\n📊 ESTADÍSTICAS DE AMOUNTS BLOQUEADOS:');
    console.log('  Mínimo:', Math.min(...amounts) + '€');
    console.log('  Máximo:', Math.max(...amounts) + '€');
    console.log('  Suma total:', amounts.reduce((a, b) => a + b, 0) + '€');
    console.log('  Promedio:', Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) + '€');

    console.log('\n\n🎯 VERIFICACIÓN:');
    console.log('  Expected blockedCredits (MAX):', Math.max(...amounts) + '€');
    console.log('  Actual blockedCredits (DB):', user.blockedCredits + '€');
    
    if (Math.max(...amounts) !== user.blockedCredits) {
      console.log('  ❌ INCONSISTENCIA DETECTADA!');
      console.log('  Diferencia:', Math.abs(Math.max(...amounts) - user.blockedCredits) + '€');
      console.log('\n💡 SOLUCIÓN: Ejecutar updateUserBlockedCredits(userId) para recalcular');
    } else {
      console.log('  ✅ blockedCredits es correcto (coincide con el máximo)');
    }
  }

  await prisma.$disconnect();
}

checkPendingBookings().catch(console.error);

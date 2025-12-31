// Script para verificar el monto exacto bloqueado a Alex García
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexPayment() {
  try {
    console.log('💰 Verificando pago de Alex García...\n');
    
    // Buscar usuario Alex
    const alex = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Alex'
        },
        email: {
          contains: 'alex'
        }
      }
    });
    
    if (!alex) {
      console.log('❌ No se encontró Alex García');
      return;
    }
    
    console.log('✅ Usuario encontrado:', alex.name);
    console.log('  - Créditos actuales:', alex.credits, 'céntimos =', (alex.credits / 100).toFixed(2), '€\n');
    
    // Buscar clase de Pedro a las 09:00 del 5 de enero de 2026
    const targetDate = new Date('2026-01-05');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookings = await prisma.booking.findMany({
      where: {
        userId: alex.id,
        timeSlot: {
          start: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      },
      include: {
        timeSlot: {
          include: {
            instructor: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📋 Reservas de Alex el 5 de enero de 2026: ${bookings.length}\n`);
    
    bookings.forEach((booking, index) => {
      const startTime = new Date(booking.timeSlot.start);
      const timeString = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`;
      
      console.log(`\n🎫 Reserva ${index + 1} - ${timeString}`);
      console.log('─────────────────────────────────');
      console.log('ID Reserva:', booking.id);
      console.log('Instructor:', booking.timeSlot.instructor?.user.name || 'N/A');
      console.log('Status:', booking.status);
      console.log('GroupSize:', booking.groupSize, 'jugadores');
      console.log('amountBlocked:', booking.amountBlocked, 'céntimos =', (booking.amountBlocked / 100).toFixed(2), '€');
      console.log('Pagado con puntos:', booking.paidWithPoints ? 'SÍ' : 'NO');
      console.log('Recycled:', booking.isRecycled || false);
      console.log('\nTimeSlot Info:');
      console.log('  - totalPrice:', booking.timeSlot.totalPrice, '€');
      console.log('  - maxPlayers:', booking.timeSlot.maxPlayers);
      
      // Calcular precio por jugador
      if (booking.groupSize > 0) {
        const pricePerPlayer = booking.amountBlocked / booking.groupSize / 100;
        console.log('  - Precio por jugador:', pricePerPlayer.toFixed(2), '€');
      }
      
      if (booking.timeSlot.totalPrice > 0) {
        const expectedPerPlayer = booking.timeSlot.totalPrice / booking.timeSlot.maxPlayers;
        console.log('  - Esperado por jugador (según totalPrice):', expectedPerPlayer.toFixed(2), '€');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlexPayment();

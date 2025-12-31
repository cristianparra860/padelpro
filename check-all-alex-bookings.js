// Script para ver todas las reservas recientes de Alex
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAlexBookings() {
  try {
    console.log('💰 Buscando todas las reservas de Alex García...\n');
    
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
    console.log('  - Email:', alex.email);
    console.log('  - Créditos actuales:', alex.credits, 'céntimos =', (alex.credits / 100).toFixed(2), '€\n');
    
    // Buscar TODAS las reservas
    const bookings = await prisma.booking.findMany({
      where: {
        userId: alex.id
      },
      include: {
        timeSlot: {
          include: {
            instructor: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Últimas 10 reservas
    });
    
    console.log(`📋 Total de reservas (últimas 10): ${bookings.length}\n`);
    
    bookings.forEach((booking, index) => {
      const startTime = new Date(booking.timeSlot.start);
      const dateString = startTime.toLocaleDateString('es-ES');
      const timeString = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`;
      
      console.log(`\n🎫 Reserva ${index + 1} - ${dateString} ${timeString}`);
      console.log('─────────────────────────────────');
      console.log('ID Reserva:', booking.id.substring(0, 20) + '...');
      console.log('Instructor:', booking.timeSlot.instructor?.user.name || 'N/A');
      console.log('Status:', booking.status);
      console.log('GroupSize:', booking.groupSize, 'jugadores');
      console.log('amountBlocked:', booking.amountBlocked, 'céntimos =', (booking.amountBlocked / 100).toFixed(2), '€');
      console.log('Puntos usados:', booking.pointsUsed || 0);
      console.log('Pagado con puntos:', booking.paidWithPoints ? 'SÍ' : 'NO');
      console.log('Recycled:', booking.isRecycled || false);
      console.log('\nTimeSlot:');
      console.log('  - totalPrice:', booking.timeSlot.totalPrice, '€');
      console.log('  - maxPlayers:', booking.timeSlot.maxPlayers);
      console.log('  - instructorPrice:', booking.timeSlot.instructorPrice, '€');
      console.log('  - courtRentalPrice:', booking.timeSlot.courtRentalPrice, '€');
      
      // Calcular precio por jugador según lo bloqueado
      if (booking.groupSize > 0) {
        const pricePerPlayerBlocked = booking.amountBlocked / booking.groupSize / 100;
        console.log('  - Precio por jugador (bloqueado):', pricePerPlayerBlocked.toFixed(2), '€');
      }
      
      // Calcular precio esperado
      if (booking.timeSlot.totalPrice > 0) {
        const expectedPerPlayer = booking.timeSlot.totalPrice / booking.timeSlot.maxPlayers;
        console.log('  - Esperado por jugador (totalPrice):', expectedPerPlayer.toFixed(2), '€');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllAlexBookings();

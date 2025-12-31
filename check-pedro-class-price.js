// Script para verificar el totalPrice de la clase de Pedro López a las 09:00
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPedroClassPrice() {
  try {
    console.log('🔍 Buscando clase de Pedro López...\n');
    
    // Buscar instructor Pedro López
    const instructor = await prisma.instructor.findFirst({
      where: {
        user: {
          name: {
            contains: 'Pedro'
          }
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!instructor) {
      console.log('❌ No se encontró instructor Pedro López');
      return;
    }
    
    console.log('✅ Instructor encontrado:', {
      id: instructor.id,
      name: instructor.user.name,
      email: instructor.user.email,
      pricePerHour: instructor.pricePerHour
    });
    
    // Buscar TimeSlots de Pedro López con hora 09:00
    const date = new Date('2026-01-05');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        instructorId: instructor.id,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        bookings: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`\n📊 TimeSlots encontrados: ${slots.length}\n`);
    
    slots.forEach((slot, index) => {
      const startTime = new Date(slot.start);
      const hours = startTime.getHours();
      const minutes = startTime.getMinutes();
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      console.log(`\n🕐 Clase ${index + 1} - ${timeString}`);
      console.log('─────────────────────────────────');
      console.log('ID:', slot.id);
      console.log('Fecha:', startTime.toLocaleDateString('es-ES'));
      console.log('totalPrice:', slot.totalPrice, '€');
      console.log('instructorPrice:', slot.instructorPrice, '€');
      console.log('courtRentalPrice:', slot.courtRentalPrice, '€');
      console.log('maxPlayers:', slot.maxPlayers);
      console.log('levelRange:', slot.levelRange);
      console.log('courtId:', slot.courtId || 'Sin pista asignada');
      console.log('Bookings:', slot.bookings.length);
      
      if (slot.bookings.length > 0) {
        console.log('\n📝 Reservas:');
        slot.bookings.forEach((booking, i) => {
          console.log(`  ${i + 1}. ${booking.user.name} (${booking.user.email})`);
          console.log(`     - Status: ${booking.status}`);
          console.log(`     - GroupSize: ${booking.groupSize}`);
          console.log(`     - amountBlocked: ${booking.amountBlocked} €`);
          console.log(`     - Recycled: ${booking.isRecycled || false}`);
        });
      }
      
      // Calcular precio por jugador
      if (slot.totalPrice > 0 && slot.maxPlayers > 0) {
        const pricePerPlayer = slot.totalPrice / slot.maxPlayers;
        console.log(`\n💰 Precio por jugador (${slot.maxPlayers} jugadores): ${pricePerPlayer.toFixed(2)} €`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPedroClassPrice();

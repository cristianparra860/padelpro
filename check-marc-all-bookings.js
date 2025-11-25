const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcBookingsAll() {
  console.log('🔍 Verificando TODAS las reservas de Marc Parra\n');
  
  // Buscar usuario Marc Parra
  const marc = await prisma.user.findFirst({
    where: {
      email: 'jugador1@padelpro.com'
    }
  });
  
  if (!marc) {
    console.log('❌ No se encontró usuario Marc Parra');
    return;
  }
  
  console.log(`✅ Usuario: ${marc.name} (${marc.email})`);
  console.log(`   ID: ${marc.id}`);
  console.log(`   Créditos: €${marc.credits}\n`);
  
  // Buscar TODAS sus reservas (incluyendo canceladas)
  const allBookings = await prisma.booking.findMany({
    where: {
      userId: marc.id
    },
    include: {
      timeSlot: {
        include: {
          instructor: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log(`📊 Total de reservas: ${allBookings.length}\n`);
  
  if (allBookings.length > 0) {
    console.log('📋 Todas las reservas:\n');
    
    allBookings.forEach((booking, i) => {
      const slot = booking.timeSlot;
      if (!slot) {
        console.log(`${i + 1}. [TimeSlot eliminado] - Booking ID: ${booking.id} - Estado: ${booking.status}\n`);
        return;
      }
      
      const date = new Date(slot.start).toISOString().split('T')[0];
      const time = new Date(slot.start).toISOString().substring(11, 16);
      const instructor = slot.instructor?.name || 'Sin instructor';
      
      console.log(`${i + 1}. ${date} ${time} | ${instructor} | ${slot.level} | ${booking.status}`);
      console.log(`   Grupo: ${booking.groupSize} | Pista: ${slot.courtNumber || 'NULL'} | Booking: ${booking.id.substring(0, 20)}...`);
    });
    
    // Filtrar día 25
    const day25 = allBookings.filter(b => {
      if (!b.timeSlot) return false;
      const date = new Date(b.timeSlot.start).toISOString().split('T')[0];
      return date === '2025-11-25';
    });
    
    console.log(`\n🎯 Reservas del día 25: ${day25.length}`);
    if (day25.length > 0) {
      day25.forEach(b => {
        const time = new Date(b.timeSlot.start).toISOString().substring(11, 16);
        console.log(`   ${time} | ${b.timeSlot.instructor?.name} | ${b.status}`);
      });
    }
  } else {
    console.log('❌ NO HAY RESERVAS');
  }
  
  await prisma.$disconnect();
}

checkMarcBookingsAll();

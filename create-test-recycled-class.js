const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSlotForTomorrow() {
  console.log('🧪 CREANDO SLOT DE PRUEBA PARA VERIFICAR BADGE\n');
  console.log('═══════════════════════════════════════════════\n');
  
  // Crear clase para MAÑANA a las 15:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0);
  
  const endTime = new Date(tomorrow);
  endTime.setMinutes(endTime.getMinutes() + 60);
  
  console.log(`📅 Creando clase para: ${tomorrow.toLocaleDateString()} ${tomorrow.toLocaleTimeString()}\n`);
  
  // 1. Crear TimeSlot con pista asignada
  const testSlot = await prisma.timeSlot.create({
    data: {
      id: `test-recycled-badge-${Date.now()}`,
      clubId: 'padel-estrella-madrid',
      courtId: 'cmhkwerqw0000tg1gqw0v944d', // Pista 1
      instructorId: 'cmhkwmdc70007tgqw3kk38uri', // Ana Lopez
      start: tomorrow,
      end: endTime,
      maxPlayers: 4,
      totalPrice: 10,
      instructorPrice: 7,
      courtRentalPrice: 3,
      level: '5-7',
      category: 'general',
      genderCategory: 'mixto',
      // ♻️ CAMPOS DE RECICLAJE - CONFIGURADOS MANUALMENTE
      hasRecycledSlots: true,
      availableRecycledSlots: 2,
      recycledSlotsOnlyPoints: true,
      creditsCost: 50,
      levelRange: '5-7'
    }
  });
  
  console.log(`✅ TimeSlot creado: ${testSlot.id}\n`);
  
  // 2. Crear 2 bookings: 1 confirmado + 1 cancelado/reciclado
  const confirmedBooking = await prisma.booking.create({
    data: {
      id: `booking-confirmed-${Date.now()}`,
      userId: 'user-1763677035576-wv1t7iun0', // Marc Parra
      timeSlotId: testSlot.id,
      groupSize: 2,
      status: 'CONFIRMED',
      isRecycled: false,
      pointsUsed: 0,
      amountBlocked: 0
    }
  });
  
  console.log(`✅ Booking confirmado creado\n`);
  
  // Esperar 10ms para que el ID sea diferente
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const recycledBooking = await prisma.booking.create({
    data: {
      id: `booking-recycled-${Date.now()}`,
      userId: 'user-1763677035576-wv1t7iun0', // Marc Parra
      timeSlotId: testSlot.id,
      groupSize: 2,
      status: 'CANCELLED',
      isRecycled: true,
      pointsUsed: 0,
      amountBlocked: 0
    }
  });
  
  console.log(`✅ Booking reciclado creado\n`);
  
  // 3. Verificar datos finales
  const finalSlot = await prisma.timeSlot.findUnique({
    where: { id: testSlot.id },
    include: {
      bookings: true,
      court: true,
      instructor: {
        include: {
          user: true
        }
      }
    }
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 RESUMEN DE LA CLASE DE PRUEBA:\n');
  console.log(`   Fecha: ${new Date(finalSlot.start).toLocaleDateString()} ${new Date(finalSlot.start).toLocaleTimeString()}`);
  console.log(`   Instructor: ${finalSlot.instructor.user.name}`);
  console.log(`   Pista: ${finalSlot.court.number}`);
  console.log('');
  console.log('   ♻️ Datos de reciclaje:');
  console.log(`   hasRecycledSlots: ${finalSlot.hasRecycledSlots}`);
  console.log(`   availableRecycledSlots: ${finalSlot.availableRecycledSlots}`);
  console.log(`   recycledSlotsOnlyPoints: ${finalSlot.recycledSlotsOnlyPoints}`);
  console.log('');
  console.log(`   📋 Bookings: ${finalSlot.bookings.length}`);
  finalSlot.bookings.forEach((b, i) => {
    console.log(`      ${i + 1}. ${b.status} | Size: ${b.groupSize} | isRecycled: ${b.isRecycled}`);
  });
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ CLASE DE PRUEBA CREADA EXITOSAMENTE\n');
  console.log('🎯 INSTRUCCIONES:\n');
  console.log(`   1. Ve a http://localhost:9002`);
  console.log(`   2. Selecciona la fecha: ${tomorrow.toLocaleDateString()}`);
  console.log(`   3. Busca la clase de Ana Lopez a las 15:00`);
  console.log(`   4. El badge amarillo "♻️ 2 plazas recicladas - Solo con puntos" DEBE aparecer\n`);
  console.log(`📝 ID de la clase: ${testSlot.id}\n`);
  
  await prisma.$disconnect();
}

createTestSlotForTomorrow().catch(console.error);

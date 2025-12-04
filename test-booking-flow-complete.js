const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookingFlow() {
  try {
    const slotId = 'ts-1764308189412-z9y4veby1rd';
    const userId = 'user-1763677110798-mq6nvxq88'; // María García
    
    console.log('\n🧪 SIMULACIÓN DE FLUJO DE RESERVA\n');
    
    // 1. Obtener info del slot
    const slot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        creditsSlots: true,
        creditsCost: true,
        totalPrice: true
      }
    });
    
    console.log('📋 Slot info:');
    console.log('   creditsSlots:', slot.creditsSlots);
    console.log('   creditsCost:', slot.creditsCost);
    console.log('   totalPrice:', slot.totalPrice);
    
    // 2. Usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        credits: true,
        blockedCredits: true,
        points: true
      }
    });
    
    console.log('\n👤 Usuario (María García):');
    console.log('   Credits:', user.credits);
    console.log('   Points:', user.points);
    console.log('   Available:', user.credits - user.blockedCredits);
    
    // 3. Simular reserva modalidad 4 jugadores
    const groupSize = 4;
    const creditsSlots = JSON.parse(slot.creditsSlots || '[]');
    
    // Calcular índices
    const startIndex = [1,2,3,4].slice(0, groupSize - 1).reduce((sum, p) => sum + p, 0);
    const endIndex = startIndex + groupSize;
    
    console.log(`\n🎯 Reserva modalidad ${groupSize} jugadores:`);
    console.log(`   Rango de índices: ${startIndex}-${endIndex-1}`);
    
    // Contar reservas existentes
    const existingBookings = await prisma.booking.count({
      where: {
        timeSlotId: slotId,
        groupSize: groupSize,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    console.log(`   Plazas ya ocupadas: ${existingBookings}`);
    
    const nextSlotIndex = startIndex + existingBookings;
    console.log(`   Próximo índice a ocupar: ${nextSlotIndex}`);
    
    const isCreditsSlot = nextSlotIndex < endIndex && creditsSlots.includes(nextSlotIndex);
    console.log(`   ¿Es creditsSlot? ${isCreditsSlot}`);
    console.log(`   creditsSlots array: [${creditsSlots.join(', ')}]`);
    
    if (isCreditsSlot) {
      const pointsRequired = slot.creditsCost;
      const pointsAvailable = user.points;
      
      console.log(`\n🎁 PLAZA CON PUNTOS:`);
      console.log(`   Puntos requeridos: ${pointsRequired}`);
      console.log(`   Puntos disponibles: ${pointsAvailable}`);
      console.log(`   ¿Puede reservar? ${pointsAvailable >= pointsRequired ? '✅ SÍ' : '❌ NO'}`);
      
      if (pointsAvailable >= pointsRequired) {
        console.log(`\n✅ FLUJO CORRECTO: María tiene ${pointsAvailable} puntos, necesita ${pointsRequired}`);
        console.log(`   La reserva debería PROCEDER con puntos`);
      } else {
        console.log(`\n❌ FLUJO INCORRECTO: Puntos insuficientes`);
        console.log(`   Faltan ${pointsRequired - pointsAvailable} puntos`);
      }
    } else {
      console.log(`\n💰 PLAZA CON EUROS:`);
      const pricePerPerson = slot.totalPrice / groupSize;
      console.log(`   Precio por persona: €${pricePerPerson.toFixed(2)}`);
      console.log(`   Credits disponibles: €${(user.credits - user.blockedCredits).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBookingFlow();

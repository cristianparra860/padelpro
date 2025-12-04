const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateUserView() {
  try {
    const slotId = 'ts-1764308189412-z9y4veby1rd';
    
    console.log('\n👤 SIMULACIÓN: Usuario María García viendo la clase\n');
    
    // 1. Cargar el slot (como lo hace el batch endpoint)
    const slot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        start: true,
        creditsSlots: true,
        creditsCost: true,
        totalPrice: true,
        instructor: {
          select: { name: true }
        }
      }
    });
    
    console.log(`📅 Clase: ${new Date(Number(slot.start)).toLocaleString('es-ES')}`);
    console.log(`👨‍🏫 Instructor: ${slot.instructor.name}`);
    console.log(`💰 Precio total: €${slot.totalPrice}`);
    console.log(`🎁 Coste en puntos: ${slot.creditsCost}p`);
    console.log(`📊 creditsSlots (raw): ${slot.creditsSlots}`);
    
    // 2. Parsear creditsSlots (como lo hace el frontend)
    const creditsSlots = JSON.parse(slot.creditsSlots || '[]');
    console.log(`📊 creditsSlots (parsed): [${creditsSlots.join(', ')}]`);
    
    // 3. Simular renderizado de TODAS las modalidades
    const modalidades = [1, 2, 3, 4];
    
    console.log('\n🎨 RENDERIZADO DE MODALIDADES:\n');
    
    modalidades.forEach(players => {
      console.log(`\n━━━ Modalidad de ${players} jugador${players > 1 ? 'es' : ''} ━━━`);
      
      // Calcular índices para esta modalidad (como en el código nuevo)
      const startIndex = [1,2,3,4].slice(0, players - 1).reduce((sum, p) => sum + p, 0);
      const endIndex = startIndex + players;
      const creditsSlotIndicesForThisModality = creditsSlots.filter(
        idx => idx >= startIndex && idx < endIndex
      );
      
      console.log(`   Rango de índices: ${startIndex} a ${endIndex - 1}`);
      console.log(`   Índices con puntos en esta modalidad: [${creditsSlotIndicesForThisModality.join(', ')}]`);
      
      const hasAnyCreditSlot = creditsSlotIndicesForThisModality.length > 0;
      const hasAllCreditSlots = creditsSlotIndicesForThisModality.length === players;
      const pricePerPerson = (slot.totalPrice / players).toFixed(2);
      
      console.log(`   💰 Distintivo derecha: ${
        hasAllCreditSlots 
          ? `🎁 ${slot.creditsCost}p (Todas con puntos)`
          : hasAnyCreditSlot
            ? `€ ${pricePerPerson} (Algunas con 🎁)`
            : `€ ${pricePerPerson}`
      }`);
      
      // Renderizar cada círculo
      for (let i = 0; i < players; i++) {
        const absoluteIndex = startIndex + i;
        const isThisCircleCredits = creditsSlots.includes(absoluteIndex);
        
        console.log(`   Círculo ${i + 1} (índice ${absoluteIndex}): ${
          isThisCircleCredits 
            ? '🟡 AMBER - 🎁 50p'
            : '⚪ BLANCO - € Libre'
        }`);
      }
    });
    
    console.log('\n\n✅ VERIFICACIÓN ESPERADA:\n');
    console.log('   Modalidad 1 jugador: Círculo 1 ⚪ blanco (índice 0 NO está activado para 1 jugador)');
    console.log('   Modalidad 2 jugadores: Círculo 1 ⚪ blanco, Círculo 2 ⚪ blanco');
    console.log('   Modalidad 3 jugadores: Todos blancos');
    console.log('   Modalidad 4 jugadores: Círculo 1 🟡 AMBER, Círculos 2-4 blancos');
    console.log('\n   ⚠️ PROBLEMA: El índice 0 se está interpretando para modalidad 1, no para modalidad 4!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateUserView();

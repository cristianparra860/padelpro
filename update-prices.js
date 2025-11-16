// Script para actualizar los precios de las clases existentes
// Establece instructorPrice y courtRentalPrice basándose en totalPrice

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePrices() {
  try {
    console.log('📊 Actualizando precios de TimeSlots...');
    
    // Precio estándar de alquiler de pista
    const COURT_RENTAL_PRICE = 10.00; // €10 por hora de pista
    
    // Obtener todos los TimeSlots
    const timeSlots = await prisma.timeSlot.findMany({
      include: {
        instructor: true
      }
    });
    
    console.log(`📝 Encontrados ${timeSlots.length} TimeSlots para actualizar`);
    
    let updated = 0;
    for (const slot of timeSlots) {
      // Calcular precio del instructor (totalPrice actual - precio de pista)
      const instructorPrice = Math.max(0, slot.totalPrice - COURT_RENTAL_PRICE);
      
      // Actualizar el TimeSlot
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          instructorPrice: instructorPrice,
          courtRentalPrice: COURT_RENTAL_PRICE,
          // totalPrice se mantiene igual
        }
      });
      
      updated++;
      if (updated % 100 === 0) {
        console.log(`  ✅ Actualizados ${updated}/${timeSlots.length}...`);
      }
    }
    
    console.log(`\n✅ Actualización completada:`);
    console.log(`   - TimeSlots actualizados: ${updated}`);
    console.log(`   - Precio de alquiler de pista: €${COURT_RENTAL_PRICE}`);
    
    // Mostrar algunos ejemplos
    const examples = await prisma.timeSlot.findMany({
      take: 3,
      include: {
        instructor: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`\n📋 Ejemplos de precios actualizados:`);
    examples.forEach(ex => {
      console.log(`   - ${ex.instructor?.name || 'Sin instructor'}:`);
      console.log(`     • Instructor: €${ex.instructorPrice}`);
      console.log(`     • Pista: €${ex.courtRentalPrice}`);
      console.log(`     • Total: €${ex.totalPrice}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePrices();

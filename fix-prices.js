/**
 * Verificar y corregir precios de TimeSlots del día 21 en adelante
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrices() {
  console.log('\n🔧 VERIFICAR Y CORREGIR PRECIOS\n');
  console.log('='.repeat(70));

  try {
    const day21 = new Date(2025, 10, 21, 0, 0, 0, 0);
    
    // Ver precios actuales
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: { gte: day21 }
      },
      take: 5
    });

    console.log('📊 PRECIOS ACTUALES (primeros 5 slots):\n');
    slots.forEach((slot, idx) => {
      const date = new Date(slot.start);
      console.log(`${idx + 1}. ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   Total: €${(slot.totalPrice / 100).toFixed(2)}`);
      console.log(`   Instructor: €${(slot.instructorPrice / 100).toFixed(2)}`);
      console.log(`   Pista: €${(slot.courtRentalPrice / 100).toFixed(2)}`);
      console.log('');
    });

    // Corregir precios (puse 2500, 1500, 1000 centavos = €25, €15, €10)
    // Debería ser: total=3000, instructor=2000, court=1000 (€30, €20, €10)
    
    console.log('='.repeat(70));
    console.log('🔧 CORRIGIENDO PRECIOS...\n');

    const result = await prisma.timeSlot.updateMany({
      where: {
        start: { gte: day21 },
        totalPrice: 2500 // Los que creé con precio incorrecto
      },
      data: {
        totalPrice: 3000, // €30
        instructorPrice: 2000, // €20
        courtRentalPrice: 1000 // €10
      }
    });

    console.log(`✅ Actualizados ${result.count} TimeSlots\n`);

    // Verificar corrección
    const fixed = await prisma.timeSlot.findMany({
      where: {
        start: { gte: day21 }
      },
      take: 5
    });

    console.log('📊 PRECIOS CORREGIDOS (primeros 5 slots):\n');
    fixed.forEach((slot, idx) => {
      const date = new Date(slot.start);
      console.log(`${idx + 1}. ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   Total: €${(slot.totalPrice / 100).toFixed(2)}`);
      console.log(`   Instructor: €${(slot.instructorPrice / 100).toFixed(2)}`);
      console.log(`   Pista: €${(slot.courtRentalPrice / 100).toFixed(2)}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrices();

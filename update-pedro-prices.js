// Script para actualizar precios de TimeSlots de Pedro López que tienen totalPrice = 0
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePedroClassPrices() {
  try {
    console.log('🔧 Actualizando precios de clases de Pedro López...\n');
    
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
        user: true,
        club: {
          select: {
            courtRentalPrice: true
          }
        }
      }
    });
    
    if (!instructor) {
      console.log('❌ No se encontró instructor Pedro López');
      return;
    }
    
    console.log('✅ Instructor encontrado:', instructor.user.name);
    const instructorRate = instructor.hourlyRate || instructor.defaultRatePerHour || 0;
    const courtPrice = instructor.club.courtRentalPrice || 0;
    console.log('  - Tarifa instructor:', instructorRate, '€/hora');
    console.log('  - Precio pista:', courtPrice, '€/hora');
    
    // Buscar TimeSlots con totalPrice = 0
    const slotsToUpdate = await prisma.timeSlot.findMany({
      where: {
        instructorId: instructor.id,
        totalPrice: 0
      }
    });
    
    console.log(`\n📊 Encontrados ${slotsToUpdate.length} TimeSlots con precio 0\n`);
    
    let updated = 0;
    
    for (const slot of slotsToUpdate) {
      const startTime = new Date(slot.start);
      const endTime = new Date(slot.end);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      // Calcular precio correcto
      const totalPrice = (instructorRate + courtPrice) * (durationMinutes / 60);
      
      console.log(`🔄 Actualizando slot ${startTime.toLocaleString()}`);
      console.log(`   - Duración: ${durationMinutes} min`);
      console.log(`   - Precio anterior: ${slot.totalPrice} €`);
      console.log(`   - Precio nuevo: ${totalPrice.toFixed(2)} €`);
      
      // Actualizar el slot
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          totalPrice: totalPrice,
          instructorPrice: instructorRate,
          courtRentalPrice: courtPrice
        }
      });
      
      updated++;
      console.log(`   ✅ Actualizado\n`);
    }
    
    console.log(`\n🎉 Proceso completado: ${updated} slots actualizados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePedroClassPrices();

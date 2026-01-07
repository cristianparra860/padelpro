const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Replicar la misma función del backend
function getInstructorPriceForTime(instructor, startDateTime) {
  const basePrice = instructor.hourlyRate || instructor.defaultRatePerHour || 0;
  
  if (!instructor.rateTiers) {
    return basePrice;
  }
  
  try {
    const rateTiers = JSON.parse(instructor.rateTiers);
    
    if (!Array.isArray(rateTiers) || rateTiers.length === 0) {
      return basePrice;
    }
    
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][startDateTime.getUTCDay()];
    const timeString = startDateTime.toISOString().substring(11, 16);
    
    const matchingTier = rateTiers.find((tier) => {
      if (!tier.days || !Array.isArray(tier.days) || !tier.startTime || !tier.endTime || typeof tier.rate !== 'number') {
        return false;
      }
      
      const isDayMatch = tier.days.includes(dayOfWeek);
      if (!isDayMatch) return false;
      
      const isTimeInRange = timeString >= tier.startTime && timeString < tier.endTime;
      
      return isTimeInRange;
    });
    
    return matchingTier ? matchingTier.rate : basePrice;
    
  } catch (error) {
    console.warn('⚠️  Error parseando rateTiers:', error);
    return basePrice;
  }
}

async function testNuevaLogicaPrecios() {
  try {
    console.log('🧪 TEST: Nueva Lógica de Precios con Tarifas Especiales\n');
    console.log('='.repeat(70));
    
    // Obtener instructor con tarifa especial configurada
    const instructors = await prisma.instructor.findMany({
      where: {
        rateTiers: { not: null }
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    
    if (instructors.length === 0) {
      console.log('❌ No hay instructores con tarifas especiales configuradas');
      return;
    }
    
    console.log(`\n📊 Encontrados ${instructors.length} instructores con tarifas especiales\n`);
    
    for (const instructor of instructors) {
      console.log(`\n👤 INSTRUCTOR: ${instructor.user.name}`);
      console.log(`   Tarifa base: ${instructor.hourlyRate || instructor.defaultRatePerHour || 0}€/hora`);
      
      let rateTiers = [];
      try {
        rateTiers = JSON.parse(instructor.rateTiers);
      } catch (e) {
        console.log('   ⚠️  Error parseando rateTiers');
        continue;
      }
      
      console.log(`\n   📋 Tarifas especiales configuradas: ${rateTiers.length}`);
      rateTiers.forEach((tier, i) => {
        console.log(`      ${i + 1}. ${tier.startTime}-${tier.endTime}: ${tier.rate}€/hora`);
        console.log(`         Días: ${tier.days.join(', ')}`);
      });
      
      // Probar con diferentes horarios del día 13 de enero (lunes)
      console.log(`\n   🧪 PRUEBAS PARA LUNES 13 DE ENERO 2026:`);
      console.log('   ' + '-'.repeat(60));
      
      const testDates = [
        new Date('2026-01-13T08:00:00.000Z'), // 8:00
        new Date('2026-01-13T08:30:00.000Z'), // 8:30
        new Date('2026-01-13T09:00:00.000Z'), // 9:00 ← DEBERÍA SER 50€
        new Date('2026-01-13T09:30:00.000Z'), // 9:30 ← DEBERÍA SER 50€
        new Date('2026-01-13T10:00:00.000Z'), // 10:00 ← VUELVE A 28€
        new Date('2026-01-13T10:30:00.000Z'), // 10:30
        new Date('2026-01-13T11:00:00.000Z'), // 11:00
      ];
      
      testDates.forEach(date => {
        const precio = getInstructorPriceForTime(instructor, date);
        const hora = date.toISOString().substring(11, 16);
        const esTarifaEspecial = precio !== (instructor.hourlyRate || instructor.defaultRatePerHour || 0);
        const emoji = esTarifaEspecial ? '🔥' : '  ';
        
        console.log(`   ${emoji} ${hora}: ${precio}€/hora ${esTarifaEspecial ? '← TARIFA ESPECIAL' : ''}`);
      });
    }
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETADO');
    console.log('='.repeat(70));
    
    console.log('\n📝 SIGUIENTE PASO:');
    console.log('   Para aplicar los cambios, debes regenerar las clases:');
    console.log('   1. Eliminar clases existentes del 13 de enero');
    console.log('   2. Llamar a: GET http://localhost:9002/api/cron/generate-cards');
    console.log('   3. Verificar que las clases de 9:00-10:00 tengan el precio especial');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNuevaLogicaPrecios();

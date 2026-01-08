const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calcula el precio del instructor según tarifas especiales por horario
 */
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

async function testAndUpdateAnaClasses() {
  try {
    console.log('🔍 Probando aplicación de tarifas especiales...\n');
    
    // Buscar a Ana González
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i.hourlyRate,
        i.defaultRatePerHour,
        i.rateTiers
      FROM Instructor i
      INNER JOIN User u ON i.userId = u.id
      WHERE u.name LIKE '%Ana%' AND u.name LIKE '%González%'
    `;
    
    if (instructors.length === 0) {
      console.log('❌ No se encontró Ana González');
      return;
    }
    
    const ana = instructors[0];
    console.log('✅ Instructora:', ana.name);
    console.log('   Tarifa base:', ana.defaultRatePerHour, '€');
    
    if (!ana.rateTiers) {
      console.log('⚠️  No tiene tarifas especiales configuradas');
      return;
    }
    
    const rateTiers = JSON.parse(ana.rateTiers);
    console.log(`\n📋 Tarifas especiales configuradas (${rateTiers.length}):`);
    rateTiers.forEach((tier, i) => {
      console.log(`   ${i + 1}. ${tier.startTime} - ${tier.endTime}: ${tier.rate}€`);
    });
    
    // Obtener clases del día 12
    const classes = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        instructorPrice,
        courtRentalPrice,
        totalPrice
      FROM TimeSlot
      WHERE instructorId = ${ana.id}
        AND start >= ${new Date('2026-01-12T00:00:00Z').getTime()}
        AND start < ${new Date('2026-01-13T00:00:00Z').getTime()}
      ORDER BY start
    `;
    
    console.log(`\n\n🔄 Analizando ${classes.length} clases del 12 de enero...\n`);
    
    let needsUpdate = 0;
    const updates = [];
    
    for (const clase of classes) {
      const startDate = new Date(clase.start);
      const hora = startDate.toISOString().substring(11, 16);
      
      // Calcular precio correcto
      const precioCorrector = getInstructorPriceForTime(ana, startDate);
      const precioActual = clase.instructorPrice;
      const courtPrice = clase.courtRentalPrice || 10; // Default court price
      const totalCorrecto = precioCorrector + courtPrice;
      
      if (Math.abs(precioCorrector - precioActual) > 0.01) {
        needsUpdate++;
        updates.push({
          id: clase.id,
          hora,
          precioActual,
          precioCorrector,
          totalActual: clase.totalPrice,
          totalCorrecto
        });
        
        console.log(`❌ ${hora}: ${precioActual}€ → ${precioCorrector}€ (diff: ${(precioCorrector - precioActual).toFixed(2)}€)`);
      } else {
        console.log(`✅ ${hora}: ${precioActual}€ (correcto)`);
      }
    }
    
    console.log(`\n\n📊 Resumen:`);
    console.log(`   Total clases: ${classes.length}`);
    console.log(`   Necesitan corrección: ${needsUpdate}`);
    console.log(`   Correctas: ${classes.length - needsUpdate}`);
    
    if (needsUpdate > 0) {
      console.log(`\n\n💾 Actualizando ${needsUpdate} clases...`);
      
      for (const update of updates) {
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET 
            instructorPrice = ${update.precioCorrector},
            totalPrice = ${update.totalCorrecto},
            updatedAt = ${Date.now()}
          WHERE id = ${update.id}
        `;
        console.log(`   ✅ ${update.hora}: ${update.precioActual}€ → ${update.precioCorrector}€`);
      }
      
      console.log(`\n✅ Actualización completada!`);
      
      // Verificar cambios
      console.log(`\n🔍 Verificando cambios...`);
      const updated = await prisma.$queryRaw`
        SELECT 
          id,
          start,
          instructorPrice,
          totalPrice
        FROM TimeSlot
        WHERE instructorId = ${ana.id}
          AND start >= ${new Date('2026-01-12T00:00:00Z').getTime()}
          AND start < ${new Date('2026-01-13T00:00:00Z').getTime()}
        ORDER BY start
        LIMIT 5
      `;
      
      console.log(`\nPrimeras 5 clases actualizadas:`);
      updated.forEach(c => {
        const hora = new Date(c.start).toISOString().substring(11, 16);
        console.log(`   ${hora}: Instructor ${c.instructorPrice}€, Total ${c.totalPrice}€`);
      });
    } else {
      console.log(`\n✅ Todas las clases ya tienen los precios correctos`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAndUpdateAnaClasses();

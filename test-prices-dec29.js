/**
 * 🧪 SCRIPT DE PRUEBA: Generación con nuevos precios (29 diciembre 2024)
 * 
 * Este script genera clases para el 29/12/2024 y verifica que:
 * - Los precios de instructor se obtienen desde la base de datos (hourlyRate)
 * - El precio total = instructor.hourlyRate + courtPrice
 */

async function testPricesGeneration() {
  try {
    console.log('🚀 Generando clases para 29 de diciembre 2025...\n');
    
    // Calcular cuántos días faltan hasta el 29 de diciembre 2025
    const today = new Date();
    const target = new Date('2025-12-29');
    const daysAhead = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    console.log(`   Días desde hoy hasta 29/12/2025: ${daysAhead}\n`);
    
    // Llamar al endpoint de generación automática (GET con parámetro targetDay)
    const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=${daysAhead}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Clases generadas exitosamente:\n');
      console.log(JSON.stringify(result, null, 2));
      
      // Ahora verificar los precios en la base de datos
      console.log('\n📊 Verificando precios de las clases generadas...\n');
      
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        // Obtener las clases del 29 de diciembre 2025
        const dec29Start = new Date('2025-12-29T00:00:00.000Z').getTime();
        const dec29End = new Date('2025-12-29T23:59:59.999Z').getTime();
        
        const slots = await prisma.$queryRaw`
          SELECT 
            ts.id,
            ts.start,
            ts.totalPrice,
            ts.instructorPrice,
            ts.courtRentalPrice,
            i.name as instructorName,
            i.hourlyRate as instructorHourlyRate
          FROM TimeSlot ts
          JOIN Instructor i ON ts.instructorId = i.id
          WHERE ts.clubId = 'padel-estrella-madrid'
          AND ts.start >= ${dec29Start}
          AND ts.start < ${dec29End}
          AND ts.courtId IS NULL
          ORDER BY ts.start, i.name
          LIMIT 10
        `;
        
        console.log(`Mostrando ${slots.length} clases del 29/12/2025:\n`);
        console.log('='.repeat(80));
        
        slots.forEach((slot, idx) => {
          const startDate = new Date(Number(slot.start));
          const timeStr = startDate.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'UTC'
          });
          
          const totalPrice = Number(slot.totalPrice);
          const instructorPrice = Number(slot.instructorPrice);
          const courtPrice = Number(slot.courtRentalPrice);
          const hourlyRate = Number(slot.instructorHourlyRate);
          
          const isCorrect = instructorPrice === hourlyRate;
          const checkMark = isCorrect ? '✅' : '❌';
          
          console.log(`${idx + 1}. ${timeStr} - ${slot.instructorName}`);
          console.log(`   Precio instructor: ${instructorPrice}€ (BD: ${hourlyRate}€) ${checkMark}`);
          console.log(`   Precio pista: ${courtPrice}€`);
          console.log(`   TOTAL: ${totalPrice}€ (debería ser ${hourlyRate + courtPrice}€)`);
          console.log('   ' + '-'.repeat(76));
        });
        
        // Resumen
        const allCorrect = slots.every(s => 
          Number(s.instructorPrice) === Number(s.instructorHourlyRate) &&
          Number(s.totalPrice) === Number(s.instructorPrice) + Number(s.courtRentalPrice)
        );
        
        console.log('='.repeat(80));
        if (allCorrect) {
          console.log('\n✅ ¡TODOS LOS PRECIOS SON CORRECTOS!');
          console.log('   El sistema está sumando correctamente: instructor.hourlyRate + courtPrice\n');
        } else {
          console.log('\n❌ HAY ERRORES EN LOS PRECIOS');
          console.log('   Revisa los cálculos en /api/cron/generate-cards/route.ts\n');
        }
        
      } finally {
        await prisma.$disconnect();
      }
      
    } else {
      console.error('❌ Error en la generación:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testPricesGeneration();

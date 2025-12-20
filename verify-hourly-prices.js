/**
 * 🧪 SCRIPT DE VERIFICACIÓN: Precios según franjas horarias
 * 
 * Verifica que las clases generadas tengan precios diferentes según el horario:
 * - Clases en horario normal (07:00-16:00): 10€ + instructor
 * - Clases en horario premium (17:00-21:00): 20€ + instructor
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPricesByTimeSlot() {
  try {
    console.log('🔍 Verificando precios por franjas horarias...\n');
    
    // 1. Mostrar las franjas horarias configuradas
    console.log('📋 Franjas horarias configuradas en el club:');
    console.log('='.repeat(80));
    
    const priceSlots = await prisma.courtPriceSlot.findMany({
      where: {
        clubId: 'padel-estrella-madrid',
        isActive: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    priceSlots.forEach(slot => {
      const days = JSON.parse(slot.daysOfWeek);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayLabels = days.map(d => dayNames[d]).join(', ');
      console.log(`\n   ${slot.startTime} - ${slot.endTime}`);
      console.log(`   Precio: ${slot.price}€/hora`);
      console.log(`   Días: ${dayLabels}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // 2. Obtener clases del 29 de diciembre en diferentes horarios
    const dec29Start = new Date('2025-12-29T00:00:00.000Z').getTime();
    const dec29End = new Date('2025-12-29T23:59:59.999Z').getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.totalPrice,
        ts.instructorPrice,
        ts.courtRentalPrice,
        i.name as instructorName
      FROM TimeSlot ts
      JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.clubId = 'padel-estrella-madrid'
      AND ts.start >= ${dec29Start}
      AND ts.start < ${dec29End}
      AND ts.courtId IS NULL
      ORDER BY ts.start
    `;
    
    console.log(`\n📊 Clases generadas el 29/12/2025 (${slots.length} clases):\n`);
    console.log('='.repeat(80));
    
    // Agrupar por hora para ver la variación de precios
    const pricesByHour = {};
    
    slots.forEach(slot => {
      const startDate = new Date(Number(slot.start));
      const hour = startDate.getUTCHours();
      const minute = startDate.getUTCMinutes();
      const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      if (!pricesByHour[timeKey]) {
        pricesByHour[timeKey] = {
          hour: timeKey,
          courtPrice: Number(slot.courtRentalPrice),
          instructorPrice: Number(slot.instructorPrice),
          totalPrice: Number(slot.totalPrice),
          count: 0,
          instructors: []
        };
      }
      
      pricesByHour[timeKey].count++;
      pricesByHour[timeKey].instructors.push(slot.instructorName);
    });
    
    // Mostrar resumen por hora
    const hours = Object.keys(pricesByHour).sort();
    
    hours.forEach(hour => {
      const data = pricesByHour[hour];
      console.log(`\n⏰ ${hour} (${data.count} clases)`);
      console.log(`   Precio pista: ${data.courtPrice}€`);
      console.log(`   Precio instructor: ${data.instructorPrice}€`);
      console.log(`   TOTAL: ${data.totalPrice}€`);
      console.log(`   Instructores: ${data.instructors.slice(0, 3).join(', ')}${data.count > 3 ? '...' : ''}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // 3. Verificar si hay diferencia de precios
    const uniqueCourtPrices = [...new Set(Object.values(pricesByHour).map(h => h.courtPrice))];
    
    console.log(`\n📈 Análisis de precios:`);
    console.log(`   Precios de pista encontrados: ${uniqueCourtPrices.join('€, ')}€`);
    
    if (uniqueCourtPrices.length > 1) {
      console.log(`   ✅ ¡CORRECTO! Hay ${uniqueCourtPrices.length} tarifas diferentes aplicándose según horario`);
    } else {
      console.log(`   ⚠️  ADVERTENCIA: Solo se encontró 1 tarifa (${uniqueCourtPrices[0]}€)`);
      console.log(`   Verifica que las franjas horarias estén configuradas correctamente`);
    }
    
    // 4. Mostrar ejemplos específicos de cada franja
    console.log(`\n\n📋 Ejemplos por franja horaria:\n`);
    
    const morningSlot = slots.find(s => {
      const hour = new Date(Number(s.start)).getUTCHours();
      return hour >= 7 && hour < 17;
    });
    
    const eveningSlot = slots.find(s => {
      const hour = new Date(Number(s.start)).getUTCHours();
      return hour >= 17 && hour < 21;
    });
    
    if (morningSlot) {
      const startDate = new Date(Number(morningSlot.start));
      console.log(`🌅 Franja NORMAL (07:00-16:00):`);
      console.log(`   Ejemplo: ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} - ${morningSlot.instructorName}`);
      console.log(`   Precio pista: ${Number(morningSlot.courtRentalPrice)}€`);
      console.log(`   Precio instructor: ${Number(morningSlot.instructorPrice)}€`);
      console.log(`   TOTAL: ${Number(morningSlot.totalPrice)}€\n`);
    }
    
    if (eveningSlot) {
      const startDate = new Date(Number(eveningSlot.start));
      console.log(`🌆 Franja PREMIUM (17:00-21:00):`);
      console.log(`   Ejemplo: ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} - ${eveningSlot.instructorName}`);
      console.log(`   Precio pista: ${Number(eveningSlot.courtRentalPrice)}€`);
      console.log(`   Precio instructor: ${Number(eveningSlot.instructorPrice)}€`);
      console.log(`   TOTAL: ${Number(eveningSlot.totalPrice)}€\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPricesByTimeSlot();

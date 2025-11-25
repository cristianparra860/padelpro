// Script para diagnosticar por qué no se crea la tarjeta ABIERTA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    console.log('\n🔍 DIAGNÓSTICO: Sistema de creación de tarjetas ABIERTO\n');
    console.log('='.repeat(70));
    
    // 1. Buscar TimeSlots con bookings
    console.log('\n1️⃣ Buscando TimeSlots con reservas...');
    const slotsWithBookings = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.genderCategory,
        ts.instructorId,
        ts.start,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
      WHERE ts.courtId IS NULL
      AND ts.start >= ${Date.now()}
      GROUP BY ts.id
      HAVING bookingCount >= 1
      ORDER BY bookingCount DESC
      LIMIT 10
    `;
    
    console.log(`\n✅ Encontrados ${slotsWithBookings.length} TimeSlots con reservas`);
    
    if (slotsWithBookings.length === 0) {
      console.log('\n⚠️ No hay TimeSlots con reservas para analizar');
      console.log('   Necesitas hacer una reserva primero para probar la lógica\n');
      await prisma.$disconnect();
      return;
    }
    
    // 2. Analizar cada TimeSlot
    for (const slot of slotsWithBookings) {
      console.log('\n' + '─'.repeat(70));
      console.log('📋 TimeSlot:', slot.id);
      console.log('   Nivel:', slot.level || 'NULL');
      console.log('   Categoría:', slot.genderCategory || 'NULL');
      console.log('   Reservas:', slot.bookingCount);
      console.log('   Horario:', new Date(Number(slot.start)).toLocaleString());
      
      // Buscar si existe tarjeta ABIERTA correspondiente
      const openSlots = await prisma.$queryRaw`
        SELECT id, level, genderCategory
        FROM TimeSlot
        WHERE instructorId = ${slot.instructorId}
        AND start = ${slot.start}
        AND level = 'ABIERTO'
        AND genderCategory = 'mixto'
        AND courtId IS NULL
      `;
      
      if (openSlots.length > 0) {
        console.log('   ✅ Tarjeta ABIERTA existe:', openSlots[0].id);
      } else {
        console.log('   ❌ NO existe tarjeta ABIERTA');
        console.log('   ⚠️ PROBLEMA: Debería haberse creado automáticamente');
        
        // Verificar si hay ALGUNA otra tarjeta para este instructor/hora
        const allSlots = await prisma.$queryRaw`
          SELECT id, level, genderCategory
          FROM TimeSlot
          WHERE instructorId = ${slot.instructorId}
          AND start = ${slot.start}
          AND courtId IS NULL
        `;
        
        console.log(`\n   🔍 Todas las tarjetas para este instructor/hora: ${allSlots.length}`);
        allSlots.forEach((s, i) => {
          console.log(`      ${i + 1}. ID: ${s.id.substring(0, 20)}... Nivel: ${s.level} Categoría: ${s.genderCategory}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n💡 CONCLUSIÓN:');
    console.log('   - Si ves "❌ NO existe tarjeta ABIERTA" en alguna clase con reservas,');
    console.log('     significa que la lógica de creación automática NO se está ejecutando.');
    console.log('   - Revisa los logs del servidor cuando hagas una reserva.\n');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

debug();

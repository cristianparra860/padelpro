const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClass() {
  try {
    console.log('🔍 Verificando clase del 6 de noviembre a las 09:00\n');
    
    // Buscar la clase del 6 de noviembre a las 09:00
    const timeSlots = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        end,
        courtNumber,
        genderCategory,
        instructorId,
        level,
        clubId
      FROM TimeSlot
      WHERE start LIKE '2025-11-06%09:00%'
      ORDER BY start ASC
    `;
    
    console.log(`📊 Encontradas ${timeSlots.length} clases a las 09:00 el 6 de noviembre:\n`);
    
    for (const slot of timeSlots) {
      console.log(`📅 TimeSlot ID: ${slot.id}`);
      console.log(`   ⏰ Horario: ${slot.start} - ${slot.end}`);
      console.log(`   🎾 Pista: ${slot.courtNumber || '❌ SIN ASIGNAR'}`);
      console.log(`   👥 Categoría: ${slot.genderCategory || '❌ SIN ASIGNAR'}`);
      console.log(`   📚 Nivel: ${slot.level}`);
      console.log(`   🏟️ Club: ${slot.clubId}`);
      
      // Obtener todas las reservas de esta clase
      const bookings = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.userId,
          b.groupSize,
          b.status,
          b.amountBlocked,
          b.createdAt,
          u.name,
          u.gender
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        ORDER BY b.createdAt ASC
      `;
      
      console.log(`\n   📋 Reservas (${bookings.length}):`);
      
      if (bookings.length === 0) {
        console.log('      ℹ️  No hay reservas para esta clase\n');
      } else {
        // Agrupar por groupSize
        const byGroupSize = {};
        bookings.forEach(b => {
          if (!byGroupSize[b.groupSize]) {
            byGroupSize[b.groupSize] = [];
          }
          byGroupSize[b.groupSize].push(b);
        });
        
        console.log('\n   📊 Agrupadas por tamaño de grupo:');
        Object.keys(byGroupSize).sort().forEach(size => {
          const count = byGroupSize[size].length;
          const status = count >= parseInt(size) ? '✅ COMPLETA' : `⏳ ${count}/${size}`;
          console.log(`\n      👥 Grupo de ${size}: ${status}`);
          byGroupSize[size].forEach((b, idx) => {
            console.log(`         ${idx + 1}. ${b.name} (${b.gender || 'NO DEFINIDO'}) - Estado: ${b.status} - €${(b.amountBlocked/100).toFixed(2)}`);
          });
        });
        
        console.log('\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClass();

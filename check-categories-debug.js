/**
 * Debug: Verificar si las categorías se están guardando en TimeSlots
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategories() {
  console.log('\n🔍 DEBUG: CATEGORÍAS EN TIMESLOTS\n');
  console.log('='.repeat(70));

  try {
    // Buscar TimeSlots con bookings para ver si tienen categoría
    const slotsWithBookings = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.level, ts.genderCategory, ts.courtId,
             i.name as instructorName,
             COUNT(b.id) as bookingCount,
             ts.createdAt, ts.updatedAt
      FROM TimeSlot ts
      LEFT JOIN Booking b ON b.timeSlotId = ts.id AND b.status IN ('PENDING', 'CONFIRMED')
      LEFT JOIN Instructor i ON i.id = ts.instructorId
      WHERE ts.start > ${Date.now()}
      GROUP BY ts.id
      HAVING bookingCount > 0
      ORDER BY bookingCount DESC, ts.start ASC
      LIMIT 10
    `;

    console.log(`📋 TimeSlots con bookings: ${slotsWithBookings.length}\n`);

    slotsWithBookings.forEach((slot, idx) => {
      const date = new Date(slot.start);
      const created = new Date(slot.createdAt);
      const updated = new Date(slot.updatedAt);
      
      console.log(`${idx + 1}. TimeSlot ${slot.id.slice(0, 8)}...`);
      console.log(`   📅 ${date.toLocaleString('es-ES')}`);
      console.log(`   👨‍🏫 ${slot.instructorName}`);
      console.log(`   📊 Nivel: ${slot.level || 'NULL'}`);
      console.log(`   🏷️ Categoría: ${slot.genderCategory || 'NULL'} ${!slot.genderCategory ? '⚠️' : '✅'}`);
      console.log(`   🏟️ Pista: ${slot.courtId || 'Sin asignar'}`);
      console.log(`   📝 Bookings: ${Number(slot.bookingCount)}`);
      console.log(`   🕐 Creado: ${created.toLocaleString('es-ES')}`);
      console.log(`   🕐 Actualizado: ${updated.toLocaleString('es-ES')}`);
      console.log('');
    });

    // Verificar si algún TimeSlot tiene categoría
    const withCategory = slotsWithBookings.filter(s => s.genderCategory);
    const withoutCategory = slotsWithBookings.filter(s => !s.genderCategory);

    console.log('='.repeat(70));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Con categoría: ${withCategory.length}`);
    console.log(`   ⚠️ Sin categoría: ${withoutCategory.length}`);
    
    if (withoutCategory.length > 0) {
      console.log('\n⚠️ PROBLEMA: Hay TimeSlots con bookings pero sin categoría');
      console.log('   Esto significa que el UPDATE no se está ejecutando');
      console.log('   O se está ejecutando pero no está guardando el valor');
    }

    // Buscar el usuario de prueba
    console.log('\n' + '='.repeat(70));
    console.log('👤 VERIFICAR GÉNERO DEL USUARIO:\n');

    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' },
      select: { id: true, name: true, gender: true }
    });

    if (user) {
      console.log(`✅ Usuario: ${user.name}`);
      console.log(`   Género: ${user.gender || 'NULL'} ${!user.gender ? '⚠️ SIN GÉNERO' : ''}`);
      
      if (!user.gender) {
        console.log('\n⚠️ PROBLEMA: El usuario no tiene género configurado');
        console.log('   Por eso classCategory se está calculando como "mixto"');
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();

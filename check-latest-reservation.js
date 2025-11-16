const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestReservation() {
  console.log('🔍 Verificando última reserva de Alex (10:30)\n');
  
  // Buscar TimeSlot de 10:30
  const start1030 = new Date('2025-11-06T10:30:00').getTime();
  
  const slots = await prisma.$queryRaw`
    SELECT * FROM TimeSlot 
    WHERE start = ${start1030} AND clubId = 'padel-estrella-madrid'
    LIMIT 1
  `;
  
  if (slots.length === 0) {
    console.log('❌ No se encontró TimeSlot para las 10:30');
    await prisma.$disconnect();
    return;
  }
  
  const slotData = slots[0];
  
  // Obtener reservas
  const bookings = await prisma.booking.findMany({
    where: { timeSlotId: slotData.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });
  
  const slot = { ...slotData, bookings };
  
  if (!slot) {
    console.log('❌ No se encontró TimeSlot para las 10:30');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📅 TimeSlot 10:30:');
  console.log(`   ID: ${slot.id}`);
  console.log(`   Pista: ${slot.courtNumber || 'SIN ASIGNAR'} ❌`);
  console.log(`   Categoría: ${slot.genderCategory || 'SIN CATEGORÍA'} ❌`);
  console.log(`   Nivel: ${slot.level}`);
  
  console.log(`\n📚 Reservas (${slot.bookings.length}):`);
  slot.bookings.forEach((b, i) => {
    console.log(`\n   ${i+1}. Usuario: ${b.user.name}`);
    console.log(`      Reserva ID: ${b.id}`);
    console.log(`      Creada: ${new Date(b.createdAt).toLocaleString()}`);
    console.log(`      Tamaño grupo: ${b.groupSize} jugador(es)`);
    console.log(`      Estado: ${b.status}`);
    console.log(`      Monto: €${b.amountBlocked/100}`);
  });
  
  // Analizar si algún grupo está completo
  console.log('\n🎯 Análisis de grupos:');
  const bookingsByGroupSize = {};
  slot.bookings.filter(b => b.status !== 'CANCELLED').forEach(b => {
    if (!bookingsByGroupSize[b.groupSize]) {
      bookingsByGroupSize[b.groupSize] = [];
    }
    bookingsByGroupSize[b.groupSize].push(b);
  });
  
  Object.entries(bookingsByGroupSize).forEach(([size, bookings]) => {
    const needed = Number(size);
    const current = bookings.length;
    const completed = current >= needed;
    console.log(`   Opción ${size} jugador(es): ${current}/${needed} ${completed ? '✅ COMPLETA' : '⏳ Pendiente'}`);
    
    if (completed) {
      console.log(`      ⚠️ PROBLEMA: Grupo completo pero pista NO asignada`);
    }
  });
  
  await prisma.$disconnect();
}

checkLatestReservation().catch(console.error);

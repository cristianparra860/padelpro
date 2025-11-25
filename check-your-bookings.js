const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosBookings() {
  console.log('🔍 VERIFICANDO INSCRIPCIONES CON CARLOS MARTINEZ\n');
  
  // Buscar instructor Carlos Martinez
  const carlos = await prisma.instructor.findFirst({
    where: { name: { contains: 'Carlos' } }
  });
  
  if (!carlos) {
    console.log('❌ Carlos Martinez no encontrado');
    return;
  }
  
  console.log(`✅ Instructor: ${carlos.name} (${carlos.id})\n`);
  
  // Fechas a verificar (7:00 hora local = 06:00 UTC en invierno)
  const dates = [
    { label: '24 Nov 7:00', utc: new Date('2025-11-24T06:00:00Z') },
    { label: '25 Nov 7:00', utc: new Date('2025-11-25T06:00:00Z') },
    { label: '10 Dic 7:00', utc: new Date('2025-12-10T06:00:00Z') }
  ];
  
  for (const date of dates) {
    const timestamp = date.utc.getTime();
    
    console.log(`📅 ${date.label} (UTC: ${date.utc.toISOString()}):\n`);
    
    // Buscar todas las tarjetas de Carlos a esa hora
    const slots = await prisma.$queryRawUnsafe(`
      SELECT ts.*, 
             (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
      FROM TimeSlot ts
      WHERE ts.instructorId = '${carlos.id}'
      AND ts.start = ${timestamp}
      ORDER BY ts.level DESC
    `);
    
    if (slots.length === 0) {
      console.log('   ⚠️  No hay tarjetas de Carlos a esa hora\n');
      continue;
    }
    
    console.log(`   📊 Total tarjetas: ${slots.length}\n`);
    
    slots.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.level.padEnd(15)} | ${(s.genderCategory || 'mixto').padEnd(10)} | Pista: ${s.courtNumber || 'N/A'} | ${s.bookingCount} reserva(s)`);
      console.log(`      ID: ${s.id.substring(0, 25)}...`);
    });
    
    // Verificar bookings en cada slot
    for (const slot of slots) {
      const bookings = await prisma.booking.findMany({
        where: { 
          timeSlotId: slot.id,
          status: { not: 'CANCELLED' }
        },
        include: {
          user: { select: { name: true, email: true } }
        }
      });
      
      if (bookings.length > 0) {
        console.log(`\n   📝 Reservas en ${slot.level}/${slot.genderCategory}:`);
        bookings.forEach(b => {
          console.log(`      • ${b.user.name} - ${b.status} (groupSize: ${b.groupSize})`);
        });
      }
    }
    
    // Verificar si hay duplicada ABIERTO
    const hasClassified = slots.some(s => s.level !== 'ABIERTO');
    const hasDuplicate = slots.some(s => s.level === 'ABIERTO' && s.genderCategory === 'mixto');
    
    if (hasClassified && hasDuplicate) {
      console.log(`\n   ✅ Correcto: Tiene clasificada + duplicada ABIERTO`);
    } else if (hasClassified && !hasDuplicate) {
      console.log(`\n   ❌ ERROR: Tiene clasificada pero NO duplicada`);
    } else if (!hasClassified && slots.length === 1) {
      console.log(`\n   ⏳ Sin inscripciones aún (solo ABIERTO original)`);
    }
    
    console.log('\n' + '─'.repeat(60) + '\n');
  }
  
  prisma.$disconnect();
}

checkCarlosBookings();

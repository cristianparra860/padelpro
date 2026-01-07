const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarPreciosPistas() {
  console.log('\n🏢 VERIFICACIÓN DE PRECIOS DE PISTAS - CLUB\n');
  console.log('='.repeat(70));
  
  // Obtener club
  const club = await prisma.club.findFirst({
    where: { id: 'club-1' },
    select: {
      id: true,
      name: true,
      courtRentalPrice: true
    }
  });

  if (!club) {
    console.log('❌ Club no encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 CONFIGURACIÓN DEL CLUB:');
  console.log(`   Nombre: ${club.name}`);
  console.log(`   Precio base de pista: ${club.courtRentalPrice}€`);

  // Obtener franjas horarias configuradas
  const priceSlots = await prisma.courtPriceSlot.findMany({
    where: {
      clubId: club.id,
      isActive: true
    },
    orderBy: {
      priority: 'desc'
    }
  });

  console.log(`   Franjas horarias especiales: ${priceSlots.length}`);

  if (priceSlots.length > 0) {
    console.log('\n   📅 Franjas configuradas:');
    priceSlots.forEach((slot, i) => {
      const days = JSON.parse(slot.daysOfWeek);
      const dayNames = {
        0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 
        4: 'Jue', 5: 'Vie', 6: 'Sáb'
      };
      const dayLabels = days.map(d => dayNames[d]).join(', ');
      
      console.log(`\n   ${i + 1}. ${slot.name || 'Sin nombre'}`);
      console.log(`      Horario: ${slot.startTime} - ${slot.endTime}`);
      console.log(`      Días: ${dayLabels}`);
      console.log(`      Precio: ${slot.price}€`);
      console.log(`      Prioridad: ${slot.priority}`);
      console.log(`      Activo: ${slot.isActive ? 'SÍ' : 'NO'}`);
    });
  }

  console.log('\n\n🔍 SIMULACIÓN DE PRECIOS PARA DIFERENTES HORARIOS:\n');
  console.log('   Probando para el lunes 13 de enero de 2026:\n');

  const testHours = [
    '07:00', '08:00', '09:00', '10:00', '11:00', 
    '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  for (const timeStr of testHours) {
    const [hour, minute] = timeStr.split(':').map(Number);
    const testDate = new Date(Date.UTC(2026, 0, 13, hour, minute));
    
    // Calcular precio usando la misma lógica que el sistema
    const price = await getCourtPriceForTime(club.id, testDate);
    
    const isSpecial = price !== club.courtRentalPrice;
    const icon = isSpecial ? '⭐' : '📌';
    const label = isSpecial ? '(TARIFA ESPECIAL)' : '(base)';
    
    console.log(`   ${icon} ${timeStr}: ${price}€ ${label}`);
  }

  console.log('\n' + '='.repeat(70));
  
  await prisma.$disconnect();
}

// Función auxiliar para calcular precio (replica la lógica del sistema)
async function getCourtPriceForTime(clubId, datetime) {
  const priceSlots = await prisma.courtPriceSlot.findMany({
    where: {
      clubId: clubId,
      isActive: true
    },
    orderBy: {
      priority: 'desc'
    }
  });

  if (priceSlots.length === 0) {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { courtRentalPrice: true }
    });
    return club?.courtRentalPrice || 10;
  }

  const hours = datetime.getUTCHours();
  const minutes = datetime.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const dayOfWeek = datetime.getUTCDay();

  for (const slot of priceSlots) {
    const validDays = JSON.parse(slot.daysOfWeek);
    
    if (!validDays.includes(dayOfWeek)) {
      continue;
    }

    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (timeInMinutes >= startMinutes && timeInMinutes < endMinutes) {
      return slot.price;
    }
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { courtRentalPrice: true }
  });
  return club?.courtRentalPrice || 10;
}

verificarPreciosPistas().catch(console.error);

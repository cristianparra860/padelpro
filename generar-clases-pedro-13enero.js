const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para obtener precio del instructor según hora
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

    const matchingTier = rateTiers.find(tier => 
      Array.isArray(tier.days) && 
      tier.days.includes(dayOfWeek) &&
      tier.startTime && 
      tier.endTime &&
      timeString >= tier.startTime && 
      timeString < tier.endTime
    );

    if (matchingTier && typeof matchingTier.rate === 'number') {
      return matchingTier.rate;
    }

    return basePrice;
  } catch (error) {
    console.error('Error parsing rateTiers:', error);
    return basePrice;
  }
}

async function generarClasesPedro() {
  console.log('\n🔄 GENERACIÓN MANUAL DE CLASES - PEDRO LÓPEZ\n');
  console.log('='.repeat(70));
  
  // Obtener instructor
  const instructor = await prisma.instructor.findFirst({
    where: { name: 'Pedro López' }
  });

  if (!instructor) {
    console.log('❌ Instructor no encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Instructor encontrado:', instructor.name);
  console.log('   Precio base:', instructor.defaultRatePerHour, '€');
  
  if (instructor.rateTiers) {
    console.log('   Tarifas especiales:', instructor.rateTiers);
  }

  // Fecha objetivo: 13 de enero 2026
  const fecha = new Date('2026-01-13T09:00:00Z');
  const clubId = 'club-1';
  
  console.log('\n📅 Generando clases para el 13 de enero 2026...\n');

  const horasInicioUTC = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  
  for (const horaInicio of horasInicioUTC) {
    const [hora, minuto] = horaInicio.split(':').map(Number);
    const start = new Date(Date.UTC(2026, 0, 13, hora, minuto));
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    // Calcular precio con la función correcta
    const instructorPrice = getInstructorPriceForTime(instructor, start);
    const courtPrice = 10;
    const totalPrice = instructorPrice + courtPrice;

    console.log(`⏰ ${horaInicio} UTC`);
    console.log(`   Precio instructor: ${instructorPrice}€`);
    console.log(`   Precio pista: ${courtPrice}€`);
    console.log(`   Total: ${totalPrice}€`);

    try {
      const slot = await prisma.timeSlot.create({
        data: {
          clubId,
          instructorId: instructor.id,
          start,
          end,
          totalPrice,
          maxPlayers: 4,
          level: 'abierto',
          genderCategory: null,
          levelRange: '0-7',
          category: 'clase'
        }
      });
      console.log(`   ✅ Creada: ${slot.id}\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('✅ Generación completada\n');
  
  await prisma.$disconnect();
}

generarClasesPedro().catch(console.error);

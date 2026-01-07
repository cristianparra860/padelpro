const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarPedroLopez() {
  console.log('\n👨‍🏫 VERIFICACIÓN DE PRECIOS - PEDRO LÓPEZ\n');
  console.log('='.repeat(70));
  
  // Obtener configuración del instructor
  const instructor = await prisma.instructor.findFirst({
    where: { name: 'Pedro López' },
    select: {
      id: true,
      name: true,
      defaultRatePerHour: true,
      rateTiers: true
    }
  });

  if (!instructor) {
    console.log('❌ Instructor Pedro López no encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 CONFIGURACIÓN DEL INSTRUCTOR:');
  console.log(`   Nombre: ${instructor.name}`);
  console.log(`   Precio base: ${instructor.defaultRatePerHour}€/hora`);
  console.log(`   Tiene tarifas especiales: ${instructor.rateTiers ? 'SÍ' : 'NO'}`);
  
  if (instructor.rateTiers) {
    const tiers = JSON.parse(instructor.rateTiers);
    console.log(`\n   Tarifas especiales configuradas:`);
    tiers.forEach((tier, i) => {
      console.log(`   ${i + 1}. ${tier.startTime}-${tier.endTime}: ${tier.rate}€`);
      console.log(`      Días: ${tier.days.join(', ')}`);
    });
  }

  // Obtener clases del 13 de enero
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2026-01-13T00:00:00Z'),
        lt: new Date('2026-01-14T00:00:00Z')
      },
      clubId: 'club-1',
      instructorId: instructor.id
    },
    orderBy: { start: 'asc' }
  });

  console.log(`\n\n📅 CLASES DEL 13 DE ENERO (${slots.length} clases):\n`);

  if (slots.length === 0) {
    console.log('⚠️  No se encontraron clases para Pedro López el 13 de enero');
  } else {
    slots.forEach(slot => {
      const fecha = new Date(slot.start);
      const hora = fecha.toISOString().substring(11, 16);
      const dia = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
      
      // Calcular precio esperado
      let precioInstructor = instructor.defaultRatePerHour || 28;
      let esTarifaEspecial = false;
      
      if (instructor.rateTiers) {
        const rateTiers = JSON.parse(instructor.rateTiers);
        const dayMap = {
          'lunes': 'monday',
          'martes': 'tuesday',
          'miércoles': 'wednesday',
          'jueves': 'thursday',
          'viernes': 'friday',
          'sábado': 'saturday',
          'domingo': 'sunday'
        };
        
        const dayEn = dayMap[dia];
        const matchingTier = rateTiers.find(tier => 
          tier.days.includes(dayEn) && 
          hora >= tier.startTime && 
          hora < tier.endTime
        );
        
        if (matchingTier) {
          precioInstructor = matchingTier.rate;
          esTarifaEspecial = true;
        }
      }
      
      const precioEsperado = precioInstructor + 10; // +10€ de pista
      const esIncorrecto = slot.totalPrice !== precioEsperado;
      
      if (esTarifaEspecial) {
        console.log(`⭐ ${hora} (${dia})`);
      } else {
        console.log(`📌 ${hora} (${dia})`);
      }
      
      console.log(`   Instructor: ${precioInstructor}€ ${esTarifaEspecial ? '(TARIFA ESPECIAL)' : '(base)'}`);
      console.log(`   Pista: 10€`);
      console.log(`   Total esperado: ${precioEsperado}€`);
      console.log(`   Total guardado: ${slot.totalPrice}€`);
      
      if (esIncorrecto) {
        console.log(`   ❌ ERROR: El precio no coincide (diferencia: ${slot.totalPrice - precioEsperado}€)`);
      } else {
        console.log(`   ✅ CORRECTO`);
      }
      console.log();
    });
  }

  console.log('='.repeat(70));
  
  await prisma.$disconnect();
}

verificarPedroLopez().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

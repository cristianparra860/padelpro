const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarPrecios() {
  console.log('\n📅 VERIFICACIÓN DE PRECIOS - 13 DE ENERO 2026\n');
  console.log('='.repeat(70));
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2026-01-13T00:00:00Z'),
        lt: new Date('2026-01-14T00:00:00Z')
      },
      clubId: 'club-1'
    },
    orderBy: { start: 'asc' },
    include: {
      instructor: {
        select: {
          name: true,
          defaultRatePerHour: true,
          rateTiers: true
        }
      }
    }
  });

  console.log(`\n✅ Total de clases encontradas: ${slots.length}\n`);

  slots.forEach(slot => {
    const fecha = new Date(slot.start);
    const hora = fecha.toISOString().substring(11, 16);
    const dia = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
    
    // Calcular precio esperado
    let precioInstructor = slot.instructor.defaultRatePerHour || 28;
    
    if (slot.instructor.rateTiers) {
      try {
        const rateTiers = JSON.parse(slot.instructor.rateTiers);
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
          console.log(`⭐ ${hora} (${dia}) | ${slot.instructor.name}`);
          console.log(`   Precio Instructor: ${precioInstructor}€ (TARIFA ESPECIAL)`);
          console.log(`   Precio Pista: 10€`);
          console.log(`   Precio Total: ${slot.totalPrice}€`);
          console.log(`   ✅ Correcto: ${slot.totalPrice === precioInstructor + 10 ? 'SÍ' : 'NO'}\n`);
        } else {
          console.log(`📌 ${hora} (${dia}) | ${slot.instructor.name}`);
          console.log(`   Precio Instructor: ${precioInstructor}€ (base)`);
          console.log(`   Precio Pista: 10€`);
          console.log(`   Precio Total: ${slot.totalPrice}€`);
          console.log(`   ✅ Correcto: ${slot.totalPrice === precioInstructor + 10 ? 'SÍ' : 'NO'}\n`);
        }
      } catch (e) {
        console.log(`❌ Error parseando rateTiers: ${e.message}`);
      }
    }
  });

  await prisma.$disconnect();
}

verificarPrecios().catch(console.error);

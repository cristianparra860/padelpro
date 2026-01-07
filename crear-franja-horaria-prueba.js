const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearFranjaHorariaPrueba() {
  console.log('🧪 CREANDO FRANJA HORARIA DE PRUEBA\n');
  console.log('='.repeat(60));

  try {
    // 1. Buscar club
    const club = await prisma.club.findFirst({
      where: { name: 'Padel Estrella' }
    });

    if (!club) {
      console.error('❌ No se encontró el club');
      return;
    }

    console.log(`\n✅ Club encontrado: ${club.name}`);
    console.log(`   ID: ${club.id}`);
    console.log(`   Precio base pistas: €${club.courtRentalPrice || 10}/hora`);

    // 2. Verificar franjas existentes
    const existingSlots = await prisma.courtPriceSlot.findMany({
      where: { clubId: club.id }
    });

    console.log(`\n📋 Franjas horarias actuales: ${existingSlots.length}`);
    if (existingSlots.length > 0) {
      existingSlots.forEach(slot => {
        const days = JSON.parse(slot.daysOfWeek);
        console.log(`   - ${slot.name}: ${slot.startTime}-${slot.endTime} €${slot.price}`);
      });
    }

    // 3. Crear franja horaria de prueba (horario prime)
    console.log('\n📝 Creando franja horaria "Horario Prime"...');
    console.log('   Horario: 18:00 - 21:00');
    console.log('   Días: Lunes a Viernes');
    console.log('   Precio: €15/hora (vs €10 base)');

    const nuevaFranja = await prisma.courtPriceSlot.create({
      data: {
        clubId: club.id,
        name: 'Horario Prime',
        startTime: '18:00',
        endTime: '21:00',
        price: 15,
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]), // Lun-Vie
        priority: 10,
        isActive: true
      }
    });

    console.log('\n✅ Franja horaria creada exitosamente!');
    console.log(`   ID: ${nuevaFranja.id}`);

    // 4. Verificar con getCourtPriceForTime
    console.log('\n🧪 Verificando función getCourtPriceForTime()...');
    
    // Importar función
    const { getCourtPriceForTime } = require('./src/lib/courtPricing');

    // Probar distintas horas
    const fechasPrueba = [
      { hora: '09:00', dia: 'Martes 13 enero 2026 09:00' },
      { hora: '18:30', dia: 'Martes 13 enero 2026 18:30' },
      { hora: '20:00', dia: 'Martes 13 enero 2026 20:00' },
      { hora: '21:30', dia: 'Martes 13 enero 2026 21:30' }
    ];

    console.log('\n📊 PRECIOS SIMULADOS:');
    console.log('─'.repeat(60));

    for (const prueba of fechasPrueba) {
      const fecha = new Date(`2026-01-13T${prueba.hora}:00.000Z`);
      const precio = await getCourtPriceForTime(club.id, fecha);
      const esHorarioPrime = prueba.hora >= '18:00' && prueba.hora < '21:00';
      
      console.log(`${prueba.dia}:`);
      console.log(`   Precio: €${precio}/hora ${esHorarioPrime ? '⭐ (HORARIO PRIME)' : '(base)'}`);
      console.log('');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('   1. Accede al panel admin: http://localhost:9002/admin/database');
    console.log('   2. Pestaña "Configuración Club"');
    console.log('   3. Verás la franja "Horario Prime" creada');
    console.log('   4. Genera nuevas clases para ver los precios aplicados');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

crearFranjaHorariaPrueba();

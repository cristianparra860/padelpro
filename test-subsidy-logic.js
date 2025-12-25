const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const timeSlotId = 'ts_1766512987102_fhnxe1svu'; // El TimeSlot de Diego
    const slotIndex = 2; // La plaza que se convirtió
    const instructorId = 'cmjhhs1l20008tga4hyl6u95t'; // Diego

    console.log('🔍 SIMULANDO LÓGICA DE INSTRUCTOR SUBSIDY\n');
    console.log(`TimeSlot: ${timeSlotId}`);
    console.log(`SlotIndex convertido: ${slotIndex}`);
    console.log(`Instructor: ${instructorId}\n`);

    // Obtener bookings activos
    const activeBookings = await prisma.$queryRaw`
      SELECT id, userId, groupSize, status 
      FROM Booking 
      WHERE timeSlotId = ${timeSlotId} 
      AND status IN ('PENDING', 'CONFIRMED')
    `;
    
    console.log(`📊 Bookings activos: ${activeBookings.length}`);
    activeBookings.forEach((b, idx) => {
      console.log(`  ${idx + 1}. User: ${b.userId}, GroupSize: ${b.groupSize}, Status: ${b.status}`);
    });
    
    // Calcular plazas ocupadas por modalidad (CÓDIGO REAL DEL ENDPOINT)
    const plazasPorModalidad = [1, 2, 3, 4].map(modalidad => {
      const bookingsDeModalidad = activeBookings.filter(b => b.groupSize === modalidad);
      const plazasOcupadas = bookingsDeModalidad.reduce((sum, b) => sum + b.groupSize, 0);
      const plazasIndividuales = activeBookings.filter(b => b.groupSize === 1).length;
      
      // Para modalidades > 1, las plazas individuales cuentan
      const totalPlazas = modalidad === 1 
        ? plazasOcupadas 
        : plazasOcupadas + (modalidad > 1 ? plazasIndividuales : 0);
      
      return { modalidad, plazasOcupadas: totalPlazas, faltantes: modalidad - totalPlazas };
    });
    
    console.log('\n📊 Plazas por modalidad (CÁLCULO REAL DEL ENDPOINT):');
    plazasPorModalidad.forEach(m => {
      console.log(`  Modalidad ${m.modalidad}: ${m.plazasOcupadas} plazas ocupadas, faltantes: ${m.faltantes}`);
    });
    
    // Verificar si el slotIndex convertido completa alguna modalidad
    const modalidadACompletar = plazasPorModalidad.find(m => 
      m.modalidad === slotIndex && m.faltantes === 1
    );
    
    console.log('\n🎯 Resultado de la verificación:');
    if (modalidadACompletar) {
      console.log(`   ✅ ¡La conversión SÍ completa la modalidad ${slotIndex}!`);
      console.log(`   ✅ El sistema DEBERÍA crear el booking del instructor`);
      console.log(`   ✅ El sistema DEBERÍA asignar pista`);
    } else {
      console.log(`   ❌ La conversión NO completa ninguna modalidad`);
      console.log(`   ❌ Modalidad buscada: ${slotIndex}`);
      console.log(`   ❌ Condición: faltantes === 1`);
      
      const targetModalidad = plazasPorModalidad.find(m => m.modalidad === slotIndex);
      if (targetModalidad) {
        console.log(`\n   📊 Estado de la modalidad ${slotIndex}:`);
        console.log(`      - Plazas ocupadas: ${targetModalidad.plazasOcupadas}`);
        console.log(`      - Faltantes: ${targetModalidad.faltantes}`);
        console.log(`      - ¿faltantes === 1?: ${targetModalidad.faltantes === 1 ? 'SÍ' : 'NO'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

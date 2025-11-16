// Test de reserva simple

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBooking() {
  try {
    console.log('\n🧪 PRUEBA DE SISTEMA DE RESERVA\n');
    
    // 1. Encontrar una propuesta disponible
    const proposal = await prisma.timeSlot.findFirst({
      where: { 
        courtId: null,
        start: { gte: new Date() }
      },
      include: {
        instructor: { include: { user: true } }
      }
    });

    if (!proposal) {
      console.log('❌ No hay propuestas disponibles');
      return;
    }

    const start = new Date(proposal.start);
    const end = new Date(proposal.end);
    
    console.log('📋 Propuesta encontrada:');
    console.log(`   ID: ${proposal.id}`);
    console.log(`   Instructor: ${proposal.instructor?.user?.name}`);
    console.log(`   Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    console.log('');

    // 2. Contar propuestas del instructor antes de la reserva
    const proposalsBeforeStart = start.toISOString();
    const proposalsBeforeEnd = end.toISOString();
    
    const proposalsBefore = await prisma.$queryRaw`
      SELECT id, start FROM TimeSlot
      WHERE instructorId = ${proposal.instructorId}
      AND courtId IS NULL
      AND start >= ${proposalsBeforeStart}
      AND start < ${proposalsBeforeEnd}
    `;
    
    console.log(`📊 Propuestas del instructor en ese rango ANTES:`);
    console.log(`   Total: ${proposalsBefore.length}`);
    proposalsBefore.forEach(p => {
      const pStart = new Date(p.start);
      console.log(`   - ${pStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    });
    console.log('');

    console.log('✅ Para probar la reserva:');
    console.log(`   1. Ve a: http://localhost:9002/admin/database`);
    console.log(`   2. Busca la clase del ${start.toLocaleDateString('es-ES')} a las ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`   3. Haz clic y reserva con 4 jugadores`);
    console.log(`   4. Verifica que:`);
    console.log(`      - Se muestra un cuadrado VERDE (clase confirmada)`);
    console.log(`      - NO aparecen cuadrados naranjas en ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`      - El instructor no tiene propuestas entre ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} y ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBooking();

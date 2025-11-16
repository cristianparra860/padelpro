// Test de reserva REAL para verificar el bloqueo

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealBooking() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DE RESERVA REAL - VERIFICACIÓN COMPLETA');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Encontrar una propuesta disponible
    const proposal = await prisma.timeSlot.findFirst({
      where: {
        courtId: null,
        start: {
          gte: new Date()
        }
      },
      include: {
        instructor: {
          include: { user: true }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    if (!proposal) {
      console.log('❌ No hay propuestas disponibles para probar');
      return;
    }

    const start = new Date(proposal.start);
    const end = new Date(proposal.end);
    
    console.log('📋 PROPUESTA SELECCIONADA PARA TEST:');
    console.log(`   ID: ${proposal.id}`);
    console.log(`   Instructor: ${proposal.instructor?.user?.name}`);
    console.log(`   Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleString('es-ES')}`);
    console.log(`   Duración: ${(end - start) / (1000 * 60)} minutos`);
    console.log('');

    // 2. Ver propuestas del instructor ANTES de la reserva
    console.log('🔍 PROPUESTAS DEL INSTRUCTOR ANTES DE RESERVAR:');
    
    const proposalsBefore = await prisma.timeSlot.findMany({
      where: {
        instructorId: proposal.instructorId,
        courtId: null,
        start: {
          gte: new Date(start.getTime() - 30 * 60 * 1000), // 30 min antes
          lte: new Date(end.getTime() + 30 * 60 * 1000)    // 30 min después
        }
      },
      orderBy: { start: 'asc' }
    });

    proposalsBefore.forEach(p => {
      const pStart = new Date(p.start);
      const pEnd = new Date(p.end);
      console.log(`   ${pStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} (${(pEnd - pStart) / (1000 * 60)} min)`);
    });
    console.log(`   Total: ${proposalsBefore.length} propuestas`);
    console.log('');

    // 3. Simular reserva (completar el grupo)
    console.log('💳 SIMULANDO RESERVA (completando grupo de 4)...');
    
    // Obtener un usuario existente
    const testUser = await prisma.user.findFirst({
      where: {
        credits: {
          gte: 50
        }
      }
    });

    if (!testUser) {
      console.log('   ❌ No hay usuarios con créditos suficientes');
      return;
    }
    
    console.log(`   Usuario: ${testUser.name} (${testUser.email})`);

    // Hacer la reserva mediante la API
    console.log('   📡 Llamando a /api/classes/book...');
    
    const response = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUser.id,
        timeSlotId: proposal.id,
        groupSize: 4
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log('   ❌ Error en la reserva:', result.error || result);
      return;
    }

    console.log('   ✅ Reserva completada');
    console.log('');

    // Esperar un momento para que se procese
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Ver propuestas del instructor DESPUÉS de la reserva
    console.log('🔍 PROPUESTAS DEL INSTRUCTOR DESPUÉS DE RESERVAR:');
    
    const proposalsAfter = await prisma.timeSlot.findMany({
      where: {
        instructorId: proposal.instructorId,
        courtId: null,
        start: {
          gte: new Date(start.getTime() - 30 * 60 * 1000),
          lte: new Date(end.getTime() + 30 * 60 * 1000)
        }
      },
      orderBy: { start: 'asc' }
    });

    proposalsAfter.forEach(p => {
      const pStart = new Date(p.start);
      const pEnd = new Date(p.end);
      console.log(`   ${pStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${pEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} (${(pEnd - pStart) / (1000 * 60)} min)`);
    });
    console.log(`   Total: ${proposalsAfter.length} propuestas`);
    console.log('');

    // 5. ANÁLISIS
    console.log('='.repeat(80));
    console.log('📊 ANÁLISIS DEL BLOQUEO:');
    console.log('='.repeat(80));
    console.log('');
    
    const deleted = proposalsBefore.length - proposalsAfter.length;
    
    console.log(`   Propuestas ANTES: ${proposalsBefore.length}`);
    console.log(`   Propuestas DESPUÉS: ${proposalsAfter.length}`);
    console.log(`   Propuestas ELIMINADAS: ${deleted}`);
    console.log('');

    // Verificar cuáles específicamente se eliminaron
    const beforeIds = new Set(proposalsBefore.map(p => p.id));
    const afterIds = new Set(proposalsAfter.map(p => p.id));
    
    console.log('   ✅ PROPUESTAS ELIMINADAS:');
    proposalsBefore.forEach(p => {
      if (!afterIds.has(p.id)) {
        const pStart = new Date(p.start);
        console.log(`      - ${pStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      }
    });
    console.log('');

    console.log('   ✅ PROPUESTAS QUE QUEDARON:');
    proposalsAfter.forEach(p => {
      const pStart = new Date(p.start);
      console.log(`      - ${pStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    });
    console.log('');

    // Verificar si el bloqueo es correcto
    const expectedDeleted = 2; // Debería eliminar 2 propuestas (inicio y mitad de hora)
    
    if (deleted === expectedDeleted) {
      console.log(`   ✅ BLOQUEO CORRECTO: Se eliminaron ${deleted} propuestas (60 minutos completos)`);
    } else if (deleted === 1) {
      console.log(`   ❌ BLOQUEO INCORRECTO: Solo se eliminó ${deleted} propuesta (30 minutos en lugar de 60)`);
    } else {
      console.log(`   ⚠️  Resultado inesperado: ${deleted} propuestas eliminadas`);
    }
    
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealBooking();

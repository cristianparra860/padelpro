const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCalendarLogic() {
  try {
    console.log('🔍 Verificando lógica del calendario\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();
    
    // 1. Clase confirmada de las 07:00
    console.log('1️⃣ Clase CONFIRMADA 07:00 - Carlos Martinez - Pista 1');
    const clase0700 = await prisma.timeSlot.findFirst({
      where: {
        start: { gte: todayISO, lt: tomorrowISO },
        courtNumber: 1,
        instructorId: { not: null }
      },
      include: {
        instructor: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    if (clase0700) {
      const start = new Date(clase0700.start);
      console.log(`   ✅ Encontrada: ${start.toLocaleTimeString()} - ${clase0700.instructor?.user?.name}`);
      console.log(`      courtId: ${clase0700.courtId}, courtNumber: ${clase0700.courtNumber}`);
      
      // Buscar si hay propuestas del mismo instructor en el mismo horario
      const propuestasDuplicadas = await prisma.timeSlot.findMany({
        where: {
          start: clase0700.start,
          instructorId: clase0700.instructorId,
          courtId: null
        }
      });
      
      if (propuestasDuplicadas.length > 0) {
        console.log(`   ⚠️ PROBLEMA: Existen ${propuestasDuplicadas.length} propuestas del mismo instructor/horario`);
        console.log(`      Esto causa que la clase aparezca en 2 lugares en el calendario`);
      } else {
        console.log(`   ✅ No hay propuestas duplicadas del mismo instructor/horario`);
      }
    }
    
    // 2. Verificar todas las clases confirmadas
    console.log('\n2️⃣ TODAS las clases CONFIRMADAS de hoy:');
    const todasConfirmadas = await prisma.timeSlot.findMany({
      where: {
        start: { gte: todayISO, lt: tomorrowISO },
        courtId: { not: null }
      },
      include: {
        instructor: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    for (const clase of todasConfirmadas) {
      const start = new Date(clase.start);
      console.log(`\n   📍 ${start.toLocaleTimeString()} - Pista ${clase.courtNumber} - ${clase.instructor?.user?.name || 'Sin instructor'}`);
      
      // Verificar propuestas del mismo instructor/horario
      const duplicadas = await prisma.timeSlot.findMany({
        where: {
          start: clase.start,
          instructorId: clase.instructorId,
          courtId: null,
          id: { not: clase.id }
        }
      });
      
      if (duplicadas.length > 0) {
        console.log(`      ⚠️ ${duplicadas.length} propuestas duplicadas - DESINCRONIZACIÓN`);
      } else {
        console.log(`      ✅ Sin propuestas duplicadas`);
      }
    }
    
    // 3. Propuestas por instructor
    console.log('\n3️⃣ Propuestas disponibles por instructor:');
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } }
    });
    
    for (const instructor of instructors) {
      const propuestas = await prisma.timeSlot.count({
        where: {
          start: { gte: todayISO, lt: tomorrowISO },
          instructorId: instructor.id,
          courtId: null
        }
      });
      
      console.log(`   ${instructor.user.name}: ${propuestas} propuestas`);
    }
    
    console.log('\n📊 CONCLUSIÓN:');
    console.log('Si hay propuestas duplicadas (mismo instructor/horario de clase confirmada),');
    console.log('el calendario mostrará la clase en DOS lugares:');
    console.log('  - Fila del instructor (propuesta naranja)');
    console.log('  - Fila de la pista (confirmada verde)');
    console.log('\nEsto es CORRECTO si el sistema permite reservas en horarios solapados.');
    console.log('Si NO es correcto, se deben eliminar las propuestas cuando se confirma una clase.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCalendarLogic();

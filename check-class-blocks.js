// Verificar bloques de pistas e instructores

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlocks() {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 SISTEMA DE BLOQUEO DE CLASES - ESTADO ACTUAL');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Ver clases confirmadas (tienen courtId no nulo)
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
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

    console.log('📊 CLASES CONFIRMADAS (con pista asignada)\n');
    if (confirmedClasses.length === 0) {
      console.log('   ℹ️  No hay clases confirmadas aún\n');
    } else {
      confirmedClasses.forEach(cls => {
        const start = new Date(cls.start);
        const end = new Date(cls.end);
        const duration = (end - start) / (1000 * 60);
        
        console.log(`   🟢 Clase ID: ${cls.id}`);
        console.log(`      Instructor: ${cls.instructor?.user?.name || 'N/A'}`);
        console.log(`      Pista: ${cls.courtNumber}`);
        console.log(`      Horario: ${start.toLocaleString('es-ES')} → ${end.toLocaleString('es-ES')}`);
        console.log(`      Duración: ${duration} minutos`);
        console.log('');
      });
    }

    // 2. Ver bloques de CourtSchedule
    console.log('='.repeat(80));
    console.log('🏟️  BLOQUES DE PISTAS (CourtSchedule)\n');
    
    const courtBlocks = await prisma.courtSchedule.findMany({
      where: {
        isOccupied: true
      },
      include: {
        court: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (courtBlocks.length === 0) {
      console.log('   ℹ️  No hay pistas bloqueadas\n');
    } else {
      courtBlocks.forEach(block => {
        const start = new Date(block.startTime);
        const end = new Date(block.endTime);
        const duration = (end - start) / (1000 * 60);
        
        console.log(`   🔒 Pista ${block.court?.number || 'N/A'} (${block.court?.name || 'N/A'})`);
        console.log(`      Inicio: ${start.toLocaleString('es-ES')}`);
        console.log(`      Fin:    ${end.toLocaleString('es-ES')}`);
        console.log(`      Duración: ${duration} minutos`);
        console.log(`      Razón: ${block.reason || 'N/A'}`);
        console.log(`      TimeSlot: ${block.timeSlotId || 'N/A'}`);
        console.log('');
      });
    }

    // 3. Ver bloques de InstructorSchedule
    console.log('='.repeat(80));
    console.log('👨‍🏫 BLOQUES DE INSTRUCTORES (InstructorSchedule)\n');
    
    const instructorBlocks = await prisma.instructorSchedule.findMany({
      where: {
        isOccupied: true
      },
      include: {
        instructor: {
          include: { user: true }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (instructorBlocks.length === 0) {
      console.log('   ℹ️  No hay instructores bloqueados\n');
    } else {
      instructorBlocks.forEach(block => {
        const start = new Date(block.startTime);
        const end = new Date(block.endTime);
        const duration = (end - start) / (1000 * 60);
        
        console.log(`   🔒 Instructor: ${block.instructor?.user?.name || 'N/A'}`);
        console.log(`      Inicio: ${start.toLocaleString('es-ES')}`);
        console.log(`      Fin:    ${end.toLocaleString('es-ES')}`);
        console.log(`      Duración: ${duration} minutos`);
        console.log(`      Razón: ${block.reason || 'N/A'}`);
        console.log(`      TimeSlot: ${block.timeSlotId || 'N/A'}`);
        console.log('');
      });
    }

    // 4. Verificar correlación entre clases confirmadas y bloques
    console.log('='.repeat(80));
    console.log('🔍 VERIFICACIÓN DE CONSISTENCIA\n');
    
    console.log(`   Clases confirmadas: ${confirmedClasses.length}`);
    console.log(`   Bloques de pistas: ${courtBlocks.length}`);
    console.log(`   Bloques de instructores: ${instructorBlocks.length}`);
    console.log('');
    
    if (confirmedClasses.length > 0) {
      if (courtBlocks.length === confirmedClasses.length && 
          instructorBlocks.length === confirmedClasses.length) {
        console.log('   ✅ CONSISTENCIA CORRECTA');
        console.log('      Cada clase confirmada tiene su bloqueo de pista e instructor');
      } else {
        console.log('   ⚠️  POSIBLE INCONSISTENCIA');
        console.log('      El número de bloques no coincide con las clases confirmadas');
        console.log('      Esto puede ser normal si hay bloques manuales');
      }
    } else {
      if (courtBlocks.length === 0 && instructorBlocks.length === 0) {
        console.log('   ✅ ESTADO INICIAL CORRECTO');
        console.log('      No hay clases confirmadas ni bloques registrados');
      } else {
        console.log('   ⚠️  HAY BLOQUES SIN CLASES CONFIRMADAS');
        console.log('      Puede haber bloques manuales o datos huérfanos');
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📋 RESUMEN\n');
    console.log('   🟢 Clases con pista asignada:', confirmedClasses.length);
    console.log('   🔒 Pistas bloqueadas:', courtBlocks.length);
    console.log('   🔒 Instructores bloqueados:', instructorBlocks.length);
    console.log('');
    
    if (confirmedClasses.length > 0) {
      const totalMinutesBlocked = confirmedClasses.reduce((sum, cls) => {
        const start = new Date(cls.start);
        const end = new Date(cls.end);
        return sum + (end - start) / (1000 * 60);
      }, 0);
      
      console.log(`   ⏱️  Total minutos bloqueados por clase: ${totalMinutesBlocked}`);
      console.log(`   ⏱️  Promedio por clase: ${totalMinutesBlocked / confirmedClasses.length} minutos`);
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

checkBlocks();

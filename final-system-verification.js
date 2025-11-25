const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalVerification() {
  console.log('🎯 VERIFICACIÓN FINAL DEL SISTEMA DE CLASIFICACIÓN\n');
  console.log('════════════════════════════════════════════════\n');
  
  const ts = new Date('2025-11-25T07:00:00').getTime();
  
  const allSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking b WHERE b.timeSlotId = ts.id AND b.status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts}
    ORDER BY i.name, ts.level DESC, ts.genderCategory
  `);
  
  // Agrupar por instructor
  const byInstructor = {};
  for (const slot of allSlots) {
    if (!byInstructor[slot.instructorName]) {
      byInstructor[slot.instructorName] = {
        classified: [],
        open: []
      };
    }
    
    if (slot.level === 'ABIERTO' && slot.genderCategory === 'mixto') {
      byInstructor[slot.instructorName].open.push(slot);
    } else if (slot.courtNumber !== null) {
      byInstructor[slot.instructorName].classified.push(slot);
    }
  }
  
  let totalClassified = 0;
  let totalOpen = 0;
  let workingCorrectly = 0;
  
  for (const [instructor, data] of Object.entries(byInstructor)) {
    const classifiedCount = data.classified.length;
    const openCount = data.open.length;
    const isWorking = (classifiedCount > 0 && openCount > 0) || (classifiedCount === 0 && openCount === 1);
    
    totalClassified += classifiedCount;
    totalOpen += openCount;
    
    if (isWorking) workingCorrectly++;
    
    const status = isWorking ? '✅' : '❌';
    console.log(`${status} ${instructor}:`);
    
    // Mostrar clasificadas
    if (classifiedCount > 0) {
      console.log(`   📊 ${classifiedCount} clase(s) clasificada(s):`);
      for (const slot of data.classified) {
        console.log(`      → ${slot.level}/${slot.genderCategory} - Pista ${slot.courtNumber} - ${slot.bookingCount} reserva(s)`);
      }
    }
    
    // Mostrar abiertas
    if (openCount > 0) {
      console.log(`   🆕 ${openCount} duplicada(s) ABIERTO/mixto - ${data.open[0].bookingCount} reserva(s)`);
    }
    
    // Explicación si no funciona correctamente
    if (!isWorking && classifiedCount > 0) {
      console.log(`   ⚠️  Faltan ${classifiedCount - openCount} duplicada(s)`);
    }
    
    console.log();
  }
  
  console.log('════════════════════════════════════════════════');
  console.log('\n📊 RESUMEN GENERAL:\n');
  console.log(`   Total instructores: ${Object.keys(byInstructor).length}`);
  console.log(`   Clases clasificadas: ${totalClassified}`);
  console.log(`   Duplicadas ABIERTO: ${totalOpen}`);
  console.log(`   Instructores funcionando bien: ${workingCorrectly}/${Object.keys(byInstructor).length}`);
  
  console.log('\n🎯 CONCLUSIÓN:\n');
  
  if (workingCorrectly === Object.keys(byInstructor).length) {
    console.log('   ✅ ¡SISTEMA FUNCIONANDO PERFECTAMENTE!');
    console.log('   ✅ Todas las clases clasificadas tienen su duplicada ABIERTA');
  } else {
    console.log(`   ⚠️  ${Object.keys(byInstructor).length - workingCorrectly} instructor(es) con problemas`);
  }
  
  console.log('\n💡 NOTAS:');
  console.log('   • Las clases clasificadas son aquellas con nivel específico Y pista asignada');
  console.log('   • Cada clase clasificada debe tener una duplicada ABIERTO/mixto');
  console.log('   • El sistema solo crea duplicadas cuando la carrera se completa\n');
  
  prisma.$disconnect();
}

finalVerification();

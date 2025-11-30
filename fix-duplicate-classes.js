const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAndFixDuplicates() {
  try {
    console.log('\n🔍 BUSCANDO CLASES DUPLICADAS\n');
    
    // Obtener todas las clases confirmadas
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      include: {
        court: { select: { id: true, number: true } },
        instructor: { include: { user: { select: { name: true } } } },
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`Total clases confirmadas: ${confirmedClasses.length}\n`);
    
    // Agrupar por pista + hora
    const grouped = {};
    confirmedClasses.forEach(cls => {
      const key = `${cls.court.number}_${new Date(cls.start).getTime()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(cls);
    });
    
    // Encontrar grupos con más de 1 clase
    const duplicates = Object.entries(grouped).filter(([_, classes]) => classes.length > 1);
    
    console.log(`❌ Grupos duplicados encontrados: ${duplicates.length}\n`);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay clases duplicadas');
      return;
    }
    
    // Mostrar detalles de duplicados
    duplicates.forEach(([key, classes]) => {
      const [courtNum, timestamp] = key.split('_');
      const date = new Date(parseInt(timestamp));
      
      console.log(`\n🔴 DUPLICADO en Pista ${courtNum} a las ${date.toLocaleString('es-ES')}`);
      console.log(`   ${classes.length} clases en el mismo lugar y hora:\n`);
      
      classes.forEach((cls, i) => {
        console.log(`   ${i + 1}. Clase ${cls.id.substring(0, 15)}...`);
        console.log(`      Instructor: ${cls.instructor?.user?.name}`);
        console.log(`      Bookings: ${cls.bookings.length}`);
        cls.bookings.forEach(b => {
          console.log(`        - ${b.user.name} (${b.status}, grupo: ${b.groupSize})`);
        });
      });
    });
    
    console.log('\n\n📝 PLAN DE CORRECCIÓN:\n');
    console.log('Para cada grupo duplicado, debemos:');
    console.log('1. Identificar la clase "ganadora" (primera creada o con más jugadores)');
    console.log('2. Mover todos los bookings a esa clase');
    console.log('3. Eliminar las clases duplicadas');
    console.log('4. Reembolsar créditos si es necesario\n');
    
    // Preguntar si quiere aplicar corrección
    console.log('⚠️ PROBLEMA IDENTIFICADO:');
    console.log('   El sistema de race booking debería prevenir estos duplicados.');
    console.log('   Esto indica que múltiples reservas se confirmaron simultáneamente');
    console.log('   sin verificar si la pista/hora ya estaba ocupada.\n');
    
    console.log('💡 SOLUCIÓN RECOMENDADA:');
    console.log('   1. Conservar la primera clase de cada grupo (la que se creó primero)');
    console.log('   2. Para las demás clases del grupo:');
    console.log('      - Cambiar su courtId a NULL (convertirlas en propuestas)');
    console.log('      - Mantener los bookings activos');
    console.log('   3. Los usuarios seguirán inscritos pero la clase volverá a competir\n');
    
    // Aplicar solución automáticamente
    console.log('🔧 APLICANDO CORRECCIÓN...\n');
    
    let fixed = 0;
    for (const [key, classes] of duplicates) {
      // Ordenar por timestamp de creación
      classes.sort((a, b) => {
        const aCreated = a.bookings[0]?.createdAt || new Date(a.start);
        const bCreated = b.bookings[0]?.createdAt || new Date(b.start);
        return aCreated.getTime() - bCreated.getTime();
      });
      
      const winner = classes[0];
      const losers = classes.slice(1);
      
      console.log(`Conservando clase ${winner.id.substring(0, 15)} (${winner.instructor?.user?.name})`);
      
      for (const loser of losers) {
        console.log(`   Revirtiendo clase ${loser.id.substring(0, 15)} a propuesta...`);
        
        await prisma.timeSlot.update({
          where: { id: loser.id },
          data: {
            courtId: null
            // Los bookings se mantienen, la clase vuelve a competir
          }
        });
        
        fixed++;
      }
    }
    
    console.log(`\n✅ ${fixed} clases revertidas a propuestas`);
    console.log('   Las clases ahora competirán nuevamente en el sistema de race booking\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAndFixDuplicates();

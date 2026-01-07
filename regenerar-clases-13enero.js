const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerarClases13Enero() {
  try {
    console.log('🔄 REGENERACIÓN DE CLASES CON NUEVOS PRECIOS\n');
    console.log('='.repeat(70));
    
    // 1. Verificar cuántas clases existen para el 13 de enero
    const fecha13 = new Date('2026-01-13T00:00:00.000Z');
    const fecha14 = new Date('2026-01-14T00:00:00.000Z');
    
    console.log('\n📋 PASO 1: Verificando clases existentes del 13 de enero...');
    
    const clasesExistentes = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: fecha13,
          lt: fecha14
        },
        courtId: null // Solo propuestas
      },
      include: {
        instructor: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`   Encontradas: ${clasesExistentes.length} clases propuestas`);
    
    if (clasesExistentes.length > 0) {
      console.log('\n   Primeras 5 clases:');
      clasesExistentes.slice(0, 5).forEach(c => {
        const hora = new Date(c.start).toISOString().substring(11, 16);
        console.log(`      ${hora} - ${c.instructor.user.name}: ${c.price || c.totalPrice}€`);
      });
    }
    
    // 2. Eliminar clases del 13 de enero
    console.log('\n\n🗑️  PASO 2: Eliminando clases del 13 de enero...');
    
    const deleted = await prisma.timeSlot.deleteMany({
      where: {
        start: {
          gte: fecha13,
          lt: fecha14
        },
        courtId: null
      }
    });
    
    console.log(`   ✅ Eliminadas: ${deleted.count} clases`);
    
    // 3. Llamar al endpoint de generación (simulación)
    console.log('\n\n⚙️  PASO 3: Generando nuevas clases...');
    console.log('   Ahora debes llamar manualmente al endpoint:');
    console.log('   GET http://localhost:9002/api/cron/generate-cards');
    console.log('\n   O ejecuta este comando:');
    console.log('   Invoke-WebRequest -Uri "http://localhost:9002/api/cron/generate-cards" -Method GET');
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ PREPARACIÓN COMPLETADA');
    console.log('='.repeat(70));
    
    console.log('\n📝 SIGUIENTES PASOS:');
    console.log('   1. ✅ Clases antiguas eliminadas');
    console.log('   2. ⏳ Llama al endpoint para regenerar con nuevos precios');
    console.log('   3. 🔍 Verifica que las clases de 9:00-10:00 tengan precio mayor');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerarClases13Enero();

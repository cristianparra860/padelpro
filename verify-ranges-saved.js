const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRanges() {
  try {
    const instructor = await prisma.instructor.findFirst({
      where: { user: { name: { contains: 'Cristian' } } },
      select: { 
        id: true, 
        levelRanges: true, 
        user: { select: { name: true } } 
      }
    });

    console.log('\n📊 Estado de Cristian Parra:');
    console.log('═══════════════════════════════════');
    console.log('ID:', instructor?.id);
    console.log('Nombre:', instructor?.user?.name);
    console.log('levelRanges (raw):', instructor?.levelRanges);
    
    if (instructor?.levelRanges) {
      try {
        const parsed = JSON.parse(instructor.levelRanges);
        console.log('\n✅ Rangos parseados:');
        parsed.forEach((range, i) => {
          console.log(`  Rango ${i + 1}: ${range.minLevel} - ${range.maxLevel}`);
        });
      } catch (e) {
        console.log('\n❌ Error al parsear JSON:', e.message);
      }
    } else {
      console.log('\n⚠️ NO HAY RANGOS CONFIGURADOS');
      console.log('El instructor necesita:');
      console.log('1. Ir a /instructor');
      console.log('2. Pestaña "Preferencias y Tarifas"');
      console.log('3. Configurar rangos y hacer clic en "Guardar Rangos"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRanges();

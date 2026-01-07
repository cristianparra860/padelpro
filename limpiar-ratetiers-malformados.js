const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarRateTiersMalformados() {
  try {
    console.log('🧹 LIMPIEZA DE rateTiers MALFORMADOS\n');
    console.log('='.repeat(70));
    
    const instructorsToFix = [
      { id: 'cmjpd034m0001tgy4pod0inrl', name: 'Pedro López' },
      { id: 'cmjpd034u0003tgy4e3tobk04', name: 'Ana González' },
      { id: 'cmjpd035x0009tgy4ghoqd7jm', name: 'Maria Fernández' }
    ];
    
    console.log(`\n📋 Instructores a limpiar: ${instructorsToFix.length}\n`);
    
    for (const instructor of instructorsToFix) {
      console.log(`\n👤 Procesando: ${instructor.name}`);
      console.log(`   ID: ${instructor.id}`);
      
      // Ver estado actual
      const current = await prisma.instructor.findUnique({
        where: { id: instructor.id }
      });
      
      console.log(`   rateTiers actual: ${current.rateTiers ? current.rateTiers.substring(0, 100) + '...' : 'null'}`);
      
      // Limpiar a array vacío
      const updated = await prisma.instructor.update({
        where: { id: instructor.id },
        data: {
          rateTiers: JSON.stringify([])
        }
      });
      
      console.log(`   ✅ Limpiado → rateTiers: []`);
    }
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('='.repeat(70));
    console.log('\n📝 RESULTADO:');
    console.log(`   • ${instructorsToFix.length} instructores procesados`);
    console.log('   • rateTiers establecidos a array vacío []');
    console.log('   • Los instructores ahora pueden configurar tarifas especiales desde el panel');
    
  } catch (error) {
    console.error('\n❌ Error en la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

limpiarRateTiersMalformados();

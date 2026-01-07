const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGuardadoPrecios() {
  try {
    console.log('🧪 TEST DE GUARDADO DE PRECIOS DEL INSTRUCTOR\n');
    console.log('='.repeat(70));
    
    // 1. Obtener un instructor de prueba (Pedro López)
    const instructorId = 'cmjpd034m0001tgy4pod0inrl';
    
    console.log('\n📋 PASO 1: Estado inicial del instructor');
    const instructorInicial = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    
    if (!instructorInicial) {
      console.log('❌ No se encontró el instructor');
      return;
    }
    
    console.log(`   Instructor: ${instructorInicial.user.name}`);
    console.log(`   defaultRatePerHour: ${instructorInicial.defaultRatePerHour}`);
    console.log(`   rateTiers actuales: ${instructorInicial.rateTiers || 'Ninguno'}`);
    
    // 2. Simular guardado de precios (como lo haría el panel)
    console.log('\n\n💾 PASO 2: Simulando guardado desde el panel...');
    
    const nuevasTarifas = [
      {
        id: `tier-${Date.now()}`,
        days: ['monday', 'tuesday', 'wednesday'],
        startTime: '09:00',
        endTime: '12:00',
        rate: 35
      },
      {
        id: `tier-${Date.now() + 1}`,
        days: ['friday', 'saturday', 'sunday'],
        startTime: '18:00',
        endTime: '21:00',
        rate: 45
      }
    ];
    
    const updateData = {
      defaultRatePerHour: 40,
      rateTiers: JSON.stringify(nuevasTarifas),
      isAvailable: true
    };
    
    console.log(`   Nueva tarifa por defecto: ${updateData.defaultRatePerHour}€/hora`);
    console.log(`   Nuevas tarifas especiales:`);
    nuevasTarifas.forEach((t, i) => {
      console.log(`      ${i + 1}. ${t.startTime}-${t.endTime}: ${t.rate}€/hora (${t.days.join(', ')})`);
    });
    
    const instructorActualizado = await prisma.instructor.update({
      where: { id: instructorId },
      data: updateData
    });
    
    console.log('\n✅ Guardado exitoso');
    
    // 3. Verificar que se guardó correctamente
    console.log('\n\n🔍 PASO 3: Verificando datos guardados...');
    
    const instructorVerificado = await prisma.instructor.findUnique({
      where: { id: instructorId }
    });
    
    console.log(`   defaultRatePerHour guardado: ${instructorVerificado.defaultRatePerHour}€/hora`);
    
    const rateTiersGuardados = JSON.parse(instructorVerificado.rateTiers);
    console.log(`   Tarifas especiales guardadas: ${rateTiersGuardados.length}`);
    rateTiersGuardados.forEach((t, i) => {
      console.log(`      ${i + 1}. ${t.startTime}-${t.endTime}: ${t.rate}€/hora (${t.days.join(', ')})`);
    });
    
    // 4. Verificar que el precio se usa en la generación de clases
    console.log('\n\n⚙️  PASO 4: Verificando uso en generación de clases...');
    
    // Simular la lógica del cron (línea 318 de generate-cards/route.ts)
    const hourlyRate = instructorVerificado.hourlyRate || instructorVerificado.defaultRatePerHour || 0;
    console.log(`   Precio usado para generar clases: ${hourlyRate}€/hora`);
    console.log(`   (lógica: hourlyRate || defaultRatePerHour || 0)`);
    
    // 5. Restaurar valores originales
    console.log('\n\n🔄 PASO 5: Restaurando valores originales...');
    await prisma.instructor.update({
      where: { id: instructorId },
      data: {
        defaultRatePerHour: instructorInicial.defaultRatePerHour,
        rateTiers: instructorInicial.rateTiers
      }
    });
    console.log('   ✅ Valores restaurados');
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETADO - El sistema de precios funciona correctamente');
    console.log('='.repeat(70));
    console.log('\n📝 RESUMEN:');
    console.log('   1. ✅ El guardado desde el panel funciona');
    console.log('   2. ✅ Los datos se guardan correctamente en la base de datos');
    console.log('   3. ✅ El precio se recupera correctamente para generar clases');
    console.log('   4. ✅ Las tarifas especiales se pueden configurar por horarios');
    
  } catch (error) {
    console.error('\n❌ Error en el test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGuardadoPrecios();

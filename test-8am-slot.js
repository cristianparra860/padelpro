const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 TEST: Creando propuesta de 8:00 AM manualmente\n');
    
    // Crear fecha de hoy a las 8:00 AM
    const today8am = new Date();
    today8am.setHours(8, 0, 0, 0);
    const today9am = new Date(today8am.getTime() + 60 * 60 * 1000);
    
    console.log(`Fecha local: ${today8am.toLocaleString('es-ES')}`);
    console.log(`ISO (UTC): ${today8am.toISOString()}\n`);
    
    // Obtener un instructor
    const instructor = await prisma.instructor.findFirst();
    
    if (!instructor) {
      console.log('❌ No hay instructores');
      return;
    }
    
    // Crear propuesta de prueba
    const testSlot = await prisma.timeSlot.create({
      data: {
        clubId: instructor.clubId,
        instructorId: instructor.id,
        start: today8am,
        end: today9am,
        maxPlayers: 4,
        totalPrice: 25.00,
        level: 'TEST-8AM',
        category: 'clases'
      }
    });
    
    console.log(`✅ Propuesta TEST creada: ${testSlot.id}\n`);
    
    // Verificar que existe en DB
    const found = await prisma.timeSlot.findUnique({
      where: { id: testSlot.id }
    });
    
    if (found) {
      console.log('✅ Propuesta encontrada en DB');
      console.log(`   start: ${new Date(found.start).toLocaleString('es-ES')}`);
      console.log(`   ISO: ${new Date(found.start).toISOString()}\n`);
    }
    
    // Ahora consultar la API
    console.log('📡 Consultando API del calendario...\n');
    
    const http = require('http');
    http.get('http://localhost:9002/api/admin/calendar', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', async () => {
        const json = JSON.parse(data);
        
        // Buscar nuestra propuesta TEST
        const testFound = json.proposedClasses?.find(p => p.level === 'TEST-8AM');
        
        if (testFound) {
          console.log('✅ Propuesta TEST ENCONTRADA en la API!');
          console.log(`   start: ${new Date(testFound.start).toLocaleString('es-ES')}`);
        } else {
          console.log('❌ Propuesta TEST NO encontrada en la API');
          console.log(`   Total propuestas: ${json.proposedClasses?.length}`);
          
          // Mostrar primeras 3
          console.log('\n   Primeras 3 propuestas:');
          json.proposedClasses?.slice(0, 3).forEach(p => {
            console.log(`     - ${new Date(p.start).toLocaleString('es-ES')} | ${p.level}`);
          });
        }
        
        // Limpiar propuesta TEST
        await prisma.timeSlot.delete({ where: { id: testSlot.id } });
        console.log('\n🗑️ Propuesta TEST eliminada');
        
        await prisma.$disconnect();
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
})();

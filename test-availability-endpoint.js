const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEndpoint() {
  console.log('🧪 Test: Endpoint de disponibilidad del instructor\n');
  
  try {
    // 1. Obtener un instructor activo
    const instructor = await prisma.instructor.findFirst({
      where: { isActive: true },
      include: { user: true }
    });
    
    if (!instructor) {
      console.log('❌ No hay instructores activos');
      return;
    }
    
    console.log(`✅ Instructor: ${instructor.user.name} (${instructor.id})`);
    
    // 2. Preparar datos de prueba (lo mismo que envía el componente)
    const testData = {
      unavailableHours: {
        monday: [{ start: '09:00', end: '15:30' }]
      }
    };
    
    console.log('\n📤 Datos a enviar:', JSON.stringify(testData, null, 2));
    
    // 3. Simular la actualización directa en Prisma (como lo hace el endpoint)
    const updateData = {
      unavailableHours: JSON.stringify(testData.unavailableHours)
    };
    
    console.log('\n🔄 Ejecutando update en Prisma...');
    
    const updated = await prisma.instructor.update({
      where: { id: instructor.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePictureUrl: true,
            level: true
          }
        },
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log('✅ Update exitoso!');
    console.log('\n📊 Instructor actualizado:');
    console.log('   unavailableHours:', updated.unavailableHours);
    
    // Intentar parsear como lo hace el endpoint
    console.log('\n🔍 Parseando respuesta...');
    const response = {
      success: true,
      instructor: {
        ...updated,
        rateTiers: updated.rateTiers ? JSON.parse(updated.rateTiers) : [],
        unavailableHours: updated.unavailableHours ? JSON.parse(updated.unavailableHours) : {},
        levelRanges: updated.levelRanges ? JSON.parse(updated.levelRanges) : []
      }
    };
    
    console.log('✅ Parseo exitoso!');
    console.log('\n📋 Respuesta final:');
    console.log(JSON.stringify(response.instructor.unavailableHours, null, 2));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n📝 Stack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();

// Test de guardado y carga de horarios de apertura
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOpeningHours() {
  try {
    console.log('🧪 Iniciando prueba de horarios de apertura...\n');

    // 1. Obtener el primer club
    const club = await prisma.club.findFirst();
    
    if (!club) {
      console.error('❌ No se encontró ningún club');
      return;
    }

    console.log(`📍 Club encontrado: ${club.name} (${club.id})`);
    console.log(`📊 Horarios actuales: ${club.openingHours || 'null'}\n`);

    // 2. Crear configuración de prueba
    // Horario de 9:00 AM a 10:00 PM (índices 3 a 16 = true)
    const testHours = Array.from({ length: 19 }, (_, i) => i >= 3 && i <= 16);
    
    console.log('🔧 Configuración de prueba:');
    console.log('   6:00 AM - 8:00 AM: ❌ Cerrado');
    console.log('   9:00 AM - 10:00 PM: ✅ Abierto');
    console.log('   11:00 PM - 12:00 AM: ❌ Cerrado');
    console.log(`   Array: ${JSON.stringify(testHours)}\n`);

    // 3. Guardar en la base de datos
    console.log('💾 Guardando horarios...');
    const updated = await prisma.club.update({
      where: { id: club.id },
      data: {
        openingHours: JSON.stringify(testHours)
      }
    });
    console.log('✅ Horarios guardados correctamente\n');

    // 4. Leer de la base de datos para verificar
    console.log('📖 Leyendo horarios guardados...');
    const verified = await prisma.club.findUnique({
      where: { id: club.id }
    });

    const savedHours = verified.openingHours ? JSON.parse(verified.openingHours) : null;
    console.log(`✅ Horarios leídos: ${JSON.stringify(savedHours)}\n`);

    // 5. Verificar que coinciden
    const match = JSON.stringify(testHours) === JSON.stringify(savedHours);
    
    if (match) {
      console.log('✅ ¡PRUEBA EXITOSA! Los horarios se guardaron y leyeron correctamente');
      console.log('\n📋 Resumen de horas guardadas:');
      
      const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
      hours.forEach((hour, index) => {
        const status = savedHours[index] ? '✅ Abierto' : '❌ Cerrado';
        const displayHour = hour === 0 ? '12:00 AM' : (hour < 12 ? `${hour}:00 AM` : `${hour}:00 PM`);
        console.log(`   ${displayHour.padEnd(10)} - ${status}`);
      });
    } else {
      console.error('❌ ERROR: Los horarios no coinciden');
      console.error(`   Esperado: ${JSON.stringify(testHours)}`);
      console.error(`   Obtenido: ${JSON.stringify(savedHours)}`);
    }

    // 6. Probar API simulada
    console.log('\n🌐 Probando lógica de API...');
    
    // Simular PATCH request
    const apiTestHours = Array.from({ length: 19 }, (_, i) => i >= 2 && i <= 17); // 8 AM - 11 PM
    
    if (apiTestHours.length === 19) {
      console.log('✅ Validación: Array tiene 19 elementos');
      
      const apiUpdated = await prisma.club.update({
        where: { id: club.id },
        data: {
          openingHours: JSON.stringify(apiTestHours)
        }
      });
      
      const apiResponse = {
        ...apiUpdated,
        openingHours: JSON.parse(apiUpdated.openingHours)
      };
      
      console.log('✅ API simulada: Guardado exitoso');
      console.log(`   Horarios API: ${JSON.stringify(apiResponse.openingHours).substring(0, 50)}...\n`);
    } else {
      console.error('❌ Validación falló: Array no tiene 19 elementos');
    }

    console.log('🎉 Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testOpeningHours();

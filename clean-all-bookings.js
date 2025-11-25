const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 LIMPIEZA COMPLETA DE RESERVAS Y USUARIOS DUPLICADOS\n');
  
  try {
    // 1. Eliminar TODAS las reservas
    console.log('1️⃣ Eliminando TODAS las reservas...');
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`   ✅ ${deletedBookings.count} reservas eliminadas\n`);
    
    // 2. Buscar usuarios duplicados "Marc Parra"
    console.log('2️⃣ Buscando usuarios duplicados "Marc Parra"...');
    const marcUsers = await prisma.user.findMany({
      where: {
        name: { contains: 'Marc Parra' }
      }
    });
    
    console.log(`   Encontrados ${marcUsers.length} usuarios:\n`);
    marcUsers.forEach(u => {
      console.log(`   - ${u.name} (${u.email}) - ID: ${u.id}`);
    });
    
    // 3. Mantener solo jugador1@padelpro.com y eliminar los demás
    const userToKeep = 'jugador1@padelpro.com';
    const usersToDelete = marcUsers.filter(u => u.email !== userToKeep);
    
    if (usersToDelete.length > 0) {
      console.log(`\n3️⃣ Eliminando ${usersToDelete.length} usuario(s) duplicado(s)...`);
      
      for (const user of usersToDelete) {
        // Primero eliminar todas las relaciones del usuario
        // Bookings ya eliminados en paso 1
        // Eliminar CreditMovements
        const movements = await prisma.creditMovement.deleteMany({
          where: { userId: user.id }
        });
        console.log(`   🔗 Eliminados ${movements.count} movimientos de crédito`);
        
        // Ahora sí eliminar el usuario
        await prisma.user.delete({
          where: { id: user.id }
        });
        console.log(`   ✅ Eliminado: ${user.name} (${user.email})`);
      }
    }
    
    // 4. Resetear courtId de todos los TimeSlots a NULL (volver a propuestas)
    console.log('\n4️⃣ Reseteando todas las clases a propuestas (courtId = NULL)...');
    const resetSlots = await prisma.timeSlot.updateMany({
      where: {
        courtId: { not: null }
      },
      data: {
        courtId: null
      }
    });
    console.log(`   ✅ ${resetSlots.count} clases reseteadas a propuestas\n`);
    
    // 5. Verificación final
    console.log('5️⃣ VERIFICACIÓN FINAL:');
    const totalBookings = await prisma.booking.count();
    const totalMarcs = await prisma.user.count({
      where: { name: { contains: 'Marc Parra' } }
    });
    const confirmedSlots = await prisma.timeSlot.count({
      where: { courtId: { not: null } }
    });
    
    console.log(`   📊 Reservas totales: ${totalBookings}`);
    console.log(`   👤 Usuarios "Marc Parra": ${totalMarcs}`);
    console.log(`   🏟️ Clases confirmadas: ${confirmedSlots}`);
    
    if (totalBookings === 0 && totalMarcs === 1 && confirmedSlots === 0) {
      console.log('\n✅ ¡BASE DE DATOS LIMPIA Y LISTA!');
    } else {
      console.log('\n⚠️ Advertencia: Algunos datos no se limpiaron correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();

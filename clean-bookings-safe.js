const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanBookingsSafely() {
  console.log('🧹 LIMPIEZA SEGURA - Solo Bookings y usuario duplicado\n');
  
  // 1. Verificar qué hay antes
  const bookingsCount = await prisma.booking.count();
  const usersCount = await prisma.user.count();
  const instructorsCount = await prisma.instructor.count();
  
  console.log('📊 ANTES:');
  console.log(`   Bookings: ${bookingsCount}`);
  console.log(`   Usuarios: ${usersCount}`);
  console.log(`   Instructores: ${instructorsCount}\n`);
  
  // 2. Identificar usuarios duplicados
  const marcUsers = await prisma.user.findMany({
    where: {
      name: { contains: 'Marc Parra' }
    }
  });
  
  console.log('👥 Usuarios "Marc Parra" encontrados:');
  marcUsers.forEach(u => {
    console.log(`   - ${u.email} (ID: ${u.id})`);
  });
  console.log('');
  
  // 3. Usuario a eliminar (el duplicado con hotmail)
  const duplicateUserId = 'user-1763673966218-39g60gqe8';
  const duplicate = marcUsers.find(u => u.id === duplicateUserId);
  
  if (duplicate) {
    console.log(`❌ Usuario duplicado a eliminar: ${duplicate.email}`);
  }
  console.log('');
  
  // 4. ELIMINAR SOLO BOOKINGS
  console.log('🗑️ Eliminando TODOS los bookings...');
  const deletedBookings = await prisma.booking.deleteMany({});
  console.log(`✅ ${deletedBookings.count} bookings eliminados\n`);
  
  // 5. ELIMINAR SOLO EL USUARIO DUPLICADO (sin afectar otros)
  if (duplicate) {
    console.log('🗑️ Eliminando usuario duplicado...');
    await prisma.user.delete({
      where: { id: duplicateUserId }
    });
    console.log(`✅ Usuario ${duplicate.email} eliminado\n`);
  }
  
  // 6. Verificar resultado final
  const bookingsAfter = await prisma.booking.count();
  const usersAfter = await prisma.user.count();
  const instructorsAfter = await prisma.instructor.count();
  
  console.log('📊 DESPUÉS:');
  console.log(`   Bookings: ${bookingsAfter} ✅`);
  console.log(`   Usuarios: ${usersAfter} (eliminado 1 duplicado) ✅`);
  console.log(`   Instructores: ${instructorsAfter} (sin cambios) ✅\n`);
  
  if (instructorsAfter !== instructorsCount) {
    console.log('⚠️ ERROR: Se eliminaron instructores por error!');
  } else {
    console.log('✅ LIMPIEZA EXITOSA - Solo se eliminaron bookings y 1 usuario duplicado');
  }
  
  await prisma.$disconnect();
}

cleanBookingsSafely();

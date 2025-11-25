import { prisma } from './src/lib/prisma.ts';

async function cleanEverythingComplete() {
  try {
    console.log('🧹 LIMPIEZA COMPLETA - Todo excepto Instructores/Usuarios válidos\n');
    
    // 1. Contar ANTES
    const instructorsBefore = await prisma.instructor.count();
    const usersBefore = await prisma.user.count();
    
    console.log('📊 ANTES:');
    console.log(`   Bookings: ${await prisma.booking.count()}`);
    console.log(`   Transactions: ${await prisma.transaction.count()}`);
    console.log(`   MatchPlayers: ${await prisma.matchPlayer.count()}`);
    console.log(`   Usuarios: ${usersBefore}`);
    console.log(`   Instructores: ${instructorsBefore}`);
    
    // 2. Identificar usuario duplicado
    const duplicateUserId = 'user-1763673966218-39g60gqe8';
    const duplicate = await prisma.user.findUnique({
      where: { id: duplicateUserId }
    });
    
    if (duplicate) {
      console.log(`\n❌ Usuario duplicado encontrado: ${duplicate.email}`);
    }
    
    // 3. ELIMINAR EN ORDEN CORRECTO (de dependencias hacia arriba)
    
    // 3a. Eliminar todos los MatchPlayers
    console.log('\n🗑️ Eliminando MatchPlayers...');
    const deletedMatchPlayers = await prisma.matchPlayer.deleteMany({});
    console.log(`✅ ${deletedMatchPlayers.count} MatchPlayers eliminados`);
    
    // 3b. Eliminar todos los Bookings
    console.log('\n🗑️ Eliminando Bookings...');
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`✅ ${deletedBookings.count} Bookings eliminados`);
    
    // 3c. Eliminar todas las Transactions
    console.log('\n🗑️ Eliminando Transactions...');
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`✅ ${deletedTransactions.count} Transactions eliminadas`);
    
    // 3d. Eliminar usuario duplicado
    if (duplicate) {
      console.log('\n🗑️ Eliminando usuario duplicado...');
      await prisma.user.delete({
        where: { id: duplicateUserId }
      });
      console.log(`✅ Usuario eliminado: ${duplicate.email}`);
    }
    
    // 4. VERIFICAR que NO se eliminaron instructores ni usuarios válidos
    const instructorsAfter = await prisma.instructor.count();
    const usersAfter = await prisma.user.count();
    
    console.log('\n📊 DESPUÉS:');
    console.log(`   Bookings: ${await prisma.booking.count()}`);
    console.log(`   Transactions: ${await prisma.transaction.count()}`);
    console.log(`   MatchPlayers: ${await prisma.matchPlayer.count()}`);
    console.log(`   Usuarios: ${usersAfter}`);
    console.log(`   Instructores: ${instructorsAfter}`);
    
    // 5. VALIDACIÓN CRÍTICA
    console.log('\n🔒 VALIDACIÓN:');
    if (instructorsAfter !== instructorsBefore) {
      console.log('⚠️ ERROR: Se eliminaron instructores por error!');
      console.log(`   Antes: ${instructorsBefore}, Después: ${instructorsAfter}`);
    } else {
      console.log('✅ Instructores preservados correctamente');
    }
    
    const expectedUsersAfter = usersBefore - (duplicate ? 1 : 0);
    if (usersAfter !== expectedUsersAfter) {
      console.log('⚠️ ERROR: Se eliminaron más usuarios de lo esperado!');
      console.log(`   Antes: ${usersBefore}, Después: ${usersAfter}, Esperado: ${expectedUsersAfter}`);
    } else {
      console.log('✅ Usuarios válidos preservados correctamente');
    }
    
    console.log('\n✅ LIMPIEZA COMPLETA EXITOSA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanEverythingComplete();

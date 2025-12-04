// Test script para verificar preferencias de usuario
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserPreferences() {
  console.log('🔍 Verificando campos de preferencias en User...\n');

  try {
    // Buscar el primer usuario
    const users = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        email: true,
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true,
      }
    });

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuarios con campos de preferencias:\n`);

    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   - prefTimeSlot: ${user.prefTimeSlot || 'null'}`);
      console.log(`   - prefViewType: ${user.prefViewType || 'null'}`);
      console.log(`   - prefPlayerCounts: ${user.prefPlayerCounts || 'null'}`);
      console.log(`   - prefInstructorIds: ${user.prefInstructorIds || 'null'}`);
      console.log('');
    });

    // Actualizar preferencias del primer usuario como prueba
    const testUser = users[0];
    console.log(`🧪 Actualizando preferencias de ${testUser.name}...`);

    const updated = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        prefPlayerCounts: '2,4',
        prefTimeSlot: 'evening',
        prefViewType: 'withBookings'
      },
      select: {
        name: true,
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
      }
    });

    console.log('✅ Preferencias actualizadas:');
    console.log(`   - prefTimeSlot: ${updated.prefTimeSlot}`);
    console.log(`   - prefViewType: ${updated.prefViewType}`);
    console.log(`   - prefPlayerCounts: ${updated.prefPlayerCounts}`);
    console.log('\n✅ Sistema de preferencias funcionando correctamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserPreferences();

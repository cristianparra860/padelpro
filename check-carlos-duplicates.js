const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosDuplicates() {
  try {
    console.log('🔍 Verificando los dos Carlos Martinez...\n');

    const carlos1 = await prisma.instructor.findUnique({
      where: { id: 'cmhkwmdc10005tgqw6fn129he' },
      include: { user: true }
    });

    const carlos2 = await prisma.instructor.findUnique({
      where: { id: 'instructor-carlos-martinez' },
      include: { user: true }
    });

    console.log('👤 CARLOS 1:');
    console.log(`   ID: ${carlos1?.id}`);
    console.log(`   Nombre: ${carlos1?.name}`);
    console.log(`   Email: ${carlos1?.user?.email}`);
    console.log(`   Activo: ${carlos1?.isActive ? '✅' : '❌'}`);

    console.log('\n👤 CARLOS 2:');
    console.log(`   ID: ${carlos2?.id}`);
    console.log(`   Nombre: ${carlos2?.name}`);
    console.log(`   Email: ${carlos2?.user?.email}`);
    console.log(`   Activo: ${carlos2?.isActive ? '✅' : '❌'}`);

    // Contar propuestas
    const proposals1 = await prisma.timeSlot.count({
      where: { instructorId: carlos1?.id, courtId: null }
    });

    const proposals2 = await prisma.timeSlot.count({
      where: { instructorId: carlos2?.id, courtId: null }
    });

    // Contar clases confirmadas
    const confirmed1 = await prisma.timeSlot.count({
      where: { instructorId: carlos1?.id, courtId: { not: null } }
    });

    const confirmed2 = await prisma.timeSlot.count({
      where: { instructorId: carlos2?.id, courtId: { not: null } }
    });

    // Contar bookings
    const bookings1 = await prisma.booking.count({
      where: { 
        timeSlot: { instructorId: carlos1?.id }
      }
    });

    const bookings2 = await prisma.booking.count({
      where: { 
        timeSlot: { instructorId: carlos2?.id }
      }
    });

    console.log('\n📊 CARLOS 1 - Datos:');
    console.log(`   Propuestas: ${proposals1}`);
    console.log(`   Confirmadas: ${confirmed1}`);
    console.log(`   Bookings: ${bookings1}`);

    console.log('\n📊 CARLOS 2 - Datos:');
    console.log(`   Propuestas: ${proposals2}`);
    console.log(`   Confirmadas: ${confirmed2}`);
    console.log(`   Bookings: ${bookings2}`);

    console.log('\n💡 RECOMENDACIÓN:');
    if (bookings1 === 0 && confirmed1 === 0) {
      console.log('   Carlos 1 no tiene bookings ni clases → Puede eliminarse');
    } else if (bookings2 === 0 && confirmed2 === 0) {
      console.log('   Carlos 2 no tiene bookings ni clases → Puede eliminarse');
    } else {
      console.log('   Ambos tienen datos → Mejor renombrar uno o desactivar');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosDuplicates();

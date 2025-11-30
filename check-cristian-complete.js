const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianData() {
  try {
    // Buscar el instructor Cristian Parra
    const instructor = await prisma.instructor.findFirst({
      where: { name: { contains: 'Cristian Parra' } },
      include: { user: true }
    });

    if (instructor) {
      console.log('✅ INSTRUCTOR ENCONTRADO:');
      console.log('ID Instructor:', instructor.id);
      console.log('Nombre:', instructor.name);
      console.log('\n👤 USUARIO VINCULADO:');
      console.log('User ID:', instructor.userId);
      console.log('Email:', instructor.user.email);
      console.log('Role:', instructor.user.role);
      console.log('Tiene password:', !!instructor.user.password);
      
      console.log('\n🔍 VERIFICACIÓN:');
      if (instructor.user.role === 'INSTRUCTOR') {
        console.log('✅ El usuario tiene rol INSTRUCTOR');
      } else {
        console.log('⚠️ El usuario tiene rol', instructor.user.role);
        console.log('Debería ser INSTRUCTOR para acceder al panel');
      }
      
      // Verificar si hay TimeSlots asignados
      const timeSlotCount = await prisma.timeSlot.count({
        where: { instructorId: instructor.id }
      });
      console.log('\n📅 TimeSlots asignados:', timeSlotCount);
      
    } else {
      console.log('❌ No se encontró instructor Cristian Parra');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianData();

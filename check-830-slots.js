const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check830Slots() {
  try {
    console.log('🔍 VERIFICANDO SLOTS DE 8:30 DEL DÍA 14\n');
    
    // 14 de noviembre a las 8:30
    const day14_830 = new Date('2025-11-14T08:30:00');
    
    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    console.log('👥 Instructores:\n');
    
    for (let i = 0; i < instructors.length; i++) {
      const instructor = instructors[i];
      
      // Buscar slot de 8:30
      const slot = await prisma.timeSlot.findFirst({
        where: {
          instructorId: instructor.id,
          start: day14_830,
          courtNumber: null
        }
      });
      
      if (slot) {
        console.log(`${i + 1}. ✅ ${instructor.name}: Slot 8:30 EXISTE`);
        console.log(`      ID: ${slot.id}`);
        console.log(`      Start: ${new Date(slot.start).toLocaleString('es-ES')}`);
      } else {
        console.log(`${i + 1}. ❌ ${instructor.name}: Slot 8:30 FALTA`);
        
        // Crear el slot faltante
        try {
          const newSlot = await prisma.timeSlot.create({
            data: {
              clubId: instructor.clubId,
              instructorId: instructor.id,
              start: day14_830,
              end: new Date(day14_830.getTime() + 60 * 60 * 1000),
              maxPlayers: 4,
              totalPrice: 25.00,
              instructorPrice: 10.00,
              courtRentalPrice: 15.00,
              level: 'ABIERTO',
              category: 'clases'
            }
          });
          
          console.log(`      ✅ CREADO: ${newSlot.id}`);
        } catch (error) {
          console.log(`      ❌ Error creando: ${error.message}`);
        }
      }
      
      console.log('');
    }
    
    // Verificar también si hay slots de 8:30 con pista asignada (confirmados)
    const confirmed830 = await prisma.timeSlot.findMany({
      where: {
        start: day14_830,
        courtNumber: {
          not: null
        }
      },
      include: {
        instructor: {
          select: { name: true }
        }
      }
    });
    
    if (confirmed830.length > 0) {
      console.log('\n⚠️ CLASES CONFIRMADAS A LAS 8:30:\n');
      confirmed830.forEach(slot => {
        console.log(`   Pista ${slot.courtNumber} - ${slot.instructor?.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check830Slots();

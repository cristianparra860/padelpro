// Script para verificar clases solapadas en la misma pista y mismo horario
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverlappingClasses() {
  console.log('🔍 Verificando clases solapadas...\n');

  try {
    // Obtener todas las clases confirmadas (con pista asignada)
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        id,
        courtNumber,
        start,
        end,
        instructorId,
        level,
        genderCategory
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY courtNumber, start
    `;

    console.log(`📊 Total clases confirmadas: ${confirmedClasses.length}\n`);

    // Buscar solapamientos
    const overlaps = [];
    
    for (let i = 0; i < confirmedClasses.length; i++) {
      const class1 = confirmedClasses[i];
      const start1 = new Date(class1.start);
      const end1 = new Date(class1.end);
      
      for (let j = i + 1; j < confirmedClasses.length; j++) {
        const class2 = confirmedClasses[j];
        
        // Solo verificar si son en la misma pista
        if (class1.courtNumber !== class2.courtNumber) continue;
        
        const start2 = new Date(class2.start);
        const end2 = new Date(class2.end);
        
        // Verificar solapamiento: start1 < end2 && start2 < end1
        if (start1 < end2 && start2 < end1) {
          overlaps.push({
            court: class1.courtNumber,
            class1: {
              id: class1.id,
              start: start1.toISOString(),
              end: end1.toISOString(),
              instructor: class1.instructorId,
              level: class1.level
            },
            class2: {
              id: class2.id,
              start: start2.toISOString(),
              end: end2.toISOString(),
              instructor: class2.instructorId,
              level: class2.level
            }
          });
        }
      }
    }

    if (overlaps.length === 0) {
      console.log('✅ No se encontraron solapamientos');
    } else {
      console.log(`❌ ENCONTRADOS ${overlaps.length} SOLAPAMIENTOS:\n`);
      
      overlaps.forEach((overlap, index) => {
        console.log(`${index + 1}. 🏟️ Pista ${overlap.court}:`);
        console.log(`   Clase 1: ${overlap.class1.start} - ${overlap.class1.end}`);
        console.log(`            ID: ${overlap.class1.id}`);
        console.log(`            Nivel: ${overlap.class1.level}`);
        console.log(`   Clase 2: ${overlap.class2.start} - ${overlap.class2.end}`);
        console.log(`            ID: ${overlap.class2.id}`);
        console.log(`            Nivel: ${overlap.class2.level}`);
        console.log('');
      });
    }

    // Verificar bookings con múltiples reservas confirmadas en el mismo día
    console.log('\n🔍 Verificando usuarios con múltiples reservas confirmadas el mismo día...\n');
    
    const multipleBookings = await prisma.$queryRaw`
      SELECT 
        u.name as userName,
        u.id as userId,
        DATE(ts.start) as bookingDate,
        COUNT(*) as bookingsCount,
        GROUP_CONCAT(b.id) as bookingIds,
        GROUP_CONCAT(time(ts.start)) as times
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.status = 'CONFIRMED'
      GROUP BY u.id, DATE(ts.start)
      HAVING COUNT(*) > 1
      ORDER BY bookingDate DESC, userName
    `;

    if (multipleBookings.length === 0) {
      console.log('✅ No hay usuarios con múltiples reservas confirmadas el mismo día');
    } else {
      console.log(`❌ ENCONTRADOS ${multipleBookings.length} USUARIOS CON MÚLTIPLES RESERVAS EL MISMO DÍA:\n`);
      
      multipleBookings.forEach((user, index) => {
        console.log(`${index + 1}. 👤 ${user.userName} (${user.userId})`);
        console.log(`   📅 Fecha: ${user.bookingDate}`);
        console.log(`   📊 Reservas confirmadas: ${user.bookingsCount}`);
        console.log(`   🕐 Horarios: ${user.times}`);
        console.log(`   🔖 IDs: ${user.bookingIds}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOverlappingClasses();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEndpoint() {
  try {
    console.log('🔍 Buscando TimeSlot con courtId asignado...');
    
    const confirmedSlot = await prisma.timeSlot.findFirst({
      where: {
        courtId: { not: null }
      },
      include: {
        instructor: {
          include: {
            user: true
          }
        },
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: {
            user: true
          }
        },
        court: true
      }
    });

    if (!confirmedSlot) {
      console.log('❌ No hay TimeSlots confirmados');
      return;
    }

    console.log('\n✅ TimeSlot encontrado:', confirmedSlot.id);
    console.log('\n📅 Campos de fecha:');
    console.log('- start:', confirmedSlot.start);
    console.log('- start type:', typeof confirmedSlot.start);
    console.log('- start constructor:', confirmedSlot.start?.constructor?.name);
    console.log('- end:', confirmedSlot.end);
    console.log('- end type:', typeof confirmedSlot.end);

    // Intentar conversión
    console.log('\n🔄 Intentando conversiones:');
    
    try {
      const startNum = Number(confirmedSlot.start);
      console.log('- Number(start):', startNum);
      const startDate = new Date(startNum);
      console.log('- new Date(Number(start)):', startDate);
      console.log('- .toISOString():', startDate.toISOString());
      console.log('- .toString():', startDate.toString());
    } catch (e) {
      console.log('❌ Error en conversión:', e.message);
    }

    // Test JSON serialization
    console.log('\n📦 Test de JSON.stringify:');
    try {
      const json = JSON.stringify({
        id: confirmedSlot.id,
        start: confirmedSlot.start,
        end: confirmedSlot.end
      });
      console.log('❌ ERROR: BigInt debería fallar en JSON.stringify');
    } catch (e) {
      console.log('✅ Correcto: BigInt no se puede serializar -', e.message);
    }

    // Test conversión correcta
    console.log('\n✅ Conversión correcta para API:');
    const formatted = {
      id: confirmedSlot.id,
      start: new Date(Number(confirmedSlot.start)).toISOString(),
      end: new Date(Number(confirmedSlot.end)).toISOString(),
      level: confirmedSlot.level,
      clubId: confirmedSlot.clubId,
      courtNumber: confirmedSlot.courtNumber
    };
    console.log(JSON.stringify(formatted, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();

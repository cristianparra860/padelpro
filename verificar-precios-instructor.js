const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarPreciosInstructor() {
  try {
    console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN DE PRECIOS DEL INSTRUCTOR\n');
    console.log('='.repeat(70));
    
    // Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`\n📊 Total de instructores activos: ${instructors.length}\n`);
    
    for (const instructor of instructors) {
      console.log(`\n👤 INSTRUCTOR: ${instructor.user.name}`);
      console.log(`   Email: ${instructor.user.email}`);
      console.log(`   ID: ${instructor.id}`);
      console.log(`   ---------------------------------`);
      
      // Precios
      console.log(`   💰 PRECIOS:`);
      console.log(`      • hourlyRate (legacy): ${instructor.hourlyRate || 'No configurado'}`);
      console.log(`      • defaultRatePerHour (nuevo): ${instructor.defaultRatePerHour || 'No configurado'}`);
      console.log(`      • Precio efectivo usado: ${instructor.hourlyRate || instructor.defaultRatePerHour || 0}€/hora`);
      
      // Tarifas especiales
      let rateTiers = [];
      try {
        rateTiers = instructor.rateTiers ? JSON.parse(instructor.rateTiers) : [];
      } catch (e) {
        console.log(`      ⚠️  Error parseando rateTiers`);
      }
      
      console.log(`\n   ⏰ TARIFAS ESPECIALES POR HORARIO: ${rateTiers.length > 0 ? rateTiers.length : 'Ninguna'}`);
      if (rateTiers.length > 0) {
        rateTiers.forEach((tier, index) => {
          console.log(`      ${index + 1}. ${tier.startTime || 'N/A'} - ${tier.endTime || 'N/A'}: ${tier.rate || 'N/A'}€/hora`);
          console.log(`         Días: ${tier.days ? tier.days.join(', ') : 'N/A'}`);
        });
      }
      
      // Disponibilidad general
      console.log(`\n   ✅ DISPONIBILIDAD: ${instructor.isAvailable ? 'ACTIVO' : 'INACTIVO'}`);
      
      // Rangos de nivel
      let levelRanges = [];
      try {
        levelRanges = instructor.levelRanges ? JSON.parse(instructor.levelRanges) : [];
      } catch (e) {
        console.log(`      ⚠️  Error parseando levelRanges`);
      }
      console.log(`   📊 RANGOS DE NIVEL: ${levelRanges.length}`);
      
      console.log(`\n   ${'='.repeat(66)}`);
    }
    
    // Verificar clases recientes generadas con precios
    console.log(`\n\n📅 VERIFICACIÓN DE CLASES GENERADAS CON PRECIOS\n`);
    console.log('='.repeat(70));
    
    const recentSlots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
        },
        courtId: null // Solo propuestas
      },
      include: {
        instructor: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { start: 'desc' },
      take: 10
    });
    
    console.log(`\nÚltimas 10 clases propuestas (sin asignar):\n`);
    
    for (const slot of recentSlots) {
      const startDate = new Date(slot.start);
      console.log(`📌 ${startDate.toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${slot.instructor.user.name}`);
      console.log(`   Precio total: ${slot.price || slot.totalPrice}€`);
      console.log(`   Precio por jugador: ${slot.pricePerPlayer}€`);
      console.log(`   Level: ${slot.levelRange || slot.level}`);
      console.log('');
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarPreciosInstructor();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 BÚSQUEDA DIRECTA DE LA CLASE CON ALEX Y DIEGO\n');
    
    // 1. Timestamp del 26 dic 2025 a las 9:00 AM (de los logs)
    const targetTimestamp = 1766736000000;
    const targetDate = new Date(targetTimestamp);
    console.log(`📅 Buscando clase en timestamp: ${targetTimestamp}`);
    console.log(`📅 Fecha: ${targetDate.toISOString()}\n`);
    
    // 2. Buscar TimeSlots en ese horario
    console.log('🔍 Buscando TimeSlots en ese horario...');
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        start: targetDate
      },
      include: {
        instructor: true,
        bookings: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(`✅ Encontrados ${timeSlots.length} TimeSlots en ese horario\n`);
    
    // Filtrar solo los que tienen a Alex
    const slotsWithAlex = timeSlots.filter(slot => 
      slot.bookings.some(b => b.userId === 'alex-user-id')
    );
    
    console.log(`✅ ${slotsWithAlex.length} TimeSlots tienen booking de Alex\n`);
    
    for (const slot of slotsWithAlex) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎯 TIME SLOT:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  ID: ${slot.id}`);
      console.log(`  Instructor: ${slot.instructor?.name || 'N/A'} (ID: ${slot.instructorId})`);
      console.log(`  Max Players: ${slot.maxPlayers}`);
      console.log(`  Level: ${slot.level}`);
      console.log(`  Gender Category: ${slot.genderCategory || 'NULL'}`);
      console.log(`  Court Number: ${slot.courtNumber || 'NULL (sin asignar)'}`);
      console.log(`  Total Price: €${slot.totalPrice}`);
      
      console.log(`\n👥 Total Bookings: ${slot.bookings.length}`);
      slot.bookings.forEach((b, idx) => {
        console.log(`    ${idx + 1}. User: ${b.user?.name || b.userId}, Status: ${b.status}, GroupSize: ${b.groupSize}, Points: ${b.paidWithPoints}, isInstructorSubsidy: ${b.isInstructorSubsidy}`);
      });
      
      console.log(`\n💰 CreditsSlots (JSON): ${slot.creditsSlots || 'NULL'}`);
      let parsedCreditsSlots = [];
      try {
        parsedCreditsSlots = slot.creditsSlots ? JSON.parse(slot.creditsSlots) : [];
        if (parsedCreditsSlots.length > 0) {
          console.log(`    Plazas convertidas a puntos: ${parsedCreditsSlots.join(', ')}`);
        }
      } catch (e) {
        console.log(`    Error parseando creditsSlots`);
      }
      
      // Verificar si es el instructor Diego
      if (slot.instructor && slot.instructor.name.includes('Diego')) {
        console.log('\n✅ ¡ESTE ES EL TIMESLOT DE DIEGO!');
        
        // Analizar por qué no se asignó pista
        console.log('\n🔍 ANÁLISIS DE COMPLETITUD:');
        
        // Contar bookings por modalidad
        const bookingsByGroupSize = {};
        slot.bookings.filter(b => b.status !== 'CANCELLED').forEach(b => {
          bookingsByGroupSize[b.groupSize] = (bookingsByGroupSize[b.groupSize] || 0) + 1;
        });
        
        console.log('📊 Bookings por groupSize:');
        Object.entries(bookingsByGroupSize).forEach(([size, count]) => {
          console.log(`    Modalidad ${size}: ${count} bookings`);
        });
        
        console.log('\n💳 CreditsSlots activos (de JSON):');
        if (parsedCreditsSlots.length > 0) {
          parsedCreditsSlots.forEach(slotIndex => {
            console.log(`    SlotIndex: ${slotIndex}`);
          });
        } else {
          console.log('    (ninguno - campo creditsSlots vacío)');
        }
        
        // Calcular plazas por modalidad (como hace credits-slots/route.ts)
        const plazasPorModalidad = [1, 2, 3, 4].map(modalidad => {
          const bookingsThisMode = bookingsByGroupSize[modalidad] || 0;
          const totalNeeded = modalidad;
          const faltantes = totalNeeded - bookingsThisMode;
          return {
            modalidad,
            bookings: bookingsThisMode,
            totalNeeded,
            faltantes
          };
        });
        
        console.log('\n🧮 PLAZAS POR MODALIDAD (cálculo):');
        plazasPorModalidad.forEach(m => {
          console.log(`    Modalidad ${m.modalidad}: ${m.bookings}/${m.totalNeeded} (faltantes: ${m.faltantes})`);
          if (m.faltantes === 1) {
            console.log(`      ⚠️ ¡FALTA 1 PLAZA! ¿Por qué no se completó?`);
          }
        });
      }
      console.log('═══════════════════════════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

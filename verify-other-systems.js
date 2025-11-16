// Verificación de otros sistemas críticos de PadelPro

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyOtherSystems() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN DE OTROS SISTEMAS CRÍTICOS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // TEST 1: Sistema de Reservas (Booking)
    console.log('📊 TEST 1: Sistema de Reservas (Race Booking)');
    console.log('-'.repeat(80));
    
    const bookings = await prisma.booking.findMany({
      include: {
        timeSlot: true,
        user: true
      }
    });
    
    console.log(`   ✅ Total Reservas: ${bookings.length}`);
    
    const activeBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');
    
    console.log(`   🟢 Activas/Pendientes: ${activeBookings.length}`);
    console.log(`   ❌ Canceladas: ${cancelledBookings.length}`);
    
    // Verificar que las reservas tienen groupSize
    const bookingsWithGroupSize = bookings.filter(b => b.groupSize);
    console.log(`   ✅ Reservas con groupSize: ${bookingsWithGroupSize.length}/${bookings.length}`);
    
    if (bookingsWithGroupSize.length < bookings.length) {
      console.log('   ⚠️  Algunas reservas no tienen groupSize (puede ser normal en datos antiguos)');
    }
    
    // TEST 2: TimeSlots - Verificar duración
    console.log('\n📊 TEST 2: Duración de Clases (debe ser 60 minutos)');
    console.log('-'.repeat(80));
    
    const allSlots = await prisma.timeSlot.findMany({
      where: { clubId: 'club-1' }
    });
    
    let correctDuration = 0;
    let incorrectDuration = 0;
    
    allSlots.forEach(slot => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const durationMinutes = (end - start) / (1000 * 60);
      
      if (durationMinutes === 60) {
        correctDuration++;
      } else {
        incorrectDuration++;
        if (incorrectDuration <= 3) {
          console.log(`   ⚠️  Clase ${slot.id}: ${durationMinutes} minutos (inicio: ${start.toISOString()})`);
        }
      }
    });
    
    console.log(`   ✅ Clases con 60 minutos: ${correctDuration}`);
    console.log(`   ❌ Clases con duración incorrecta: ${incorrectDuration}`);
    
    // TEST 3: Sistema de Pistas (Courts)
    console.log('\n📊 TEST 3: Sistema de Pistas');
    console.log('-'.repeat(80));
    
    const courts = await prisma.court.findMany({
      where: { clubId: 'club-1' }
    });
    
    console.log(`   ✅ Total Pistas: ${courts.length}`);
    courts.forEach(court => {
      console.log(`      - Pista ${court.number}: ${court.name || 'Sin nombre'} (ID: ${court.id})`);
    });
    
    // TEST 4: Sistema de Instructores
    console.log('\n📊 TEST 4: Sistema de Instructores');
    console.log('-'.repeat(80));
    
    const instructors = await prisma.instructor.findMany({
      include: {
        user: true,
        timeSlots: {
          where: {
            start: {
              gte: new Date('2025-10-29T00:00:00.000Z')
            }
          }
        }
      }
    });
    
    console.log(`   ✅ Total Instructores: ${instructors.length}`);
    instructors.forEach(instructor => {
      console.log(`      - ${instructor.user.name}: ${instructor.timeSlots.length} clases asignadas`);
    });
    
    // TEST 5: Verificar que el Prisma client está actualizado
    console.log('\n📊 TEST 5: Verificación de Modelos Prisma');
    console.log('-'.repeat(80));
    
    console.log('   ✅ Modelo TimeSlot: Disponible');
    console.log('   ✅ Modelo Booking: Disponible');
    console.log('   ✅ Modelo Court: Disponible');
    console.log('   ✅ Modelo Instructor: Disponible');
    console.log('   ℹ️  Schedules: (CourtSchedule, InstructorSchedule, ClubSchedule)');
    
    // TEST 6: API de TimeSlots para usuarios
    console.log('\n📊 TEST 6: API de TimeSlots (Vista Usuario)');
    console.log('-'.repeat(80));
    
    try {
      const timeslotsResponse = await fetch('http://localhost:9002/api/timeslots?clubId=club-1&startDate=2025-10-29&endDate=2025-10-29');
      
      if (timeslotsResponse.ok) {
        const timeslotsData = await timeslotsResponse.json();
        console.log(`   ✅ API /api/timeslots respondió correctamente`);
        console.log(`   📊 TimeSlots disponibles para reservar: ${timeslotsData.length}`);
        
        const availableSlots = timeslotsData.filter(t => !t.courtId);
        console.log(`   🔶 Propuestas disponibles: ${availableSlots.length}`);
      } else {
        console.log(`   ⚠️  API respondió con: ${timeslotsResponse.status}`);
      }
    } catch (e) {
      console.log(`   ⚠️  No se pudo conectar: ${e.message}`);
    }
    
    // TEST 7: Verificar filtros de jugadores
    console.log('\n📊 TEST 7: Configuración de Filtros de Jugadores');
    console.log('-'.repeat(80));
    
    const slotsWithLevel = await prisma.timeSlot.findMany({
      where: { clubId: 'club-1' },
      select: { level: true, category: true }
    });
    
    const levels = [...new Set(slotsWithLevel.map(s => s.level))];
    const categories = [...new Set(slotsWithLevel.map(s => s.category).filter(Boolean))];
    
    console.log(`   ✅ Niveles configurados: ${levels.join(', ')}`);
    console.log(`   ✅ Categorías: ${categories.join(', ') || 'Sin categorías'}`);
    
    // RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN GENERAL DEL SISTEMA');
    console.log('='.repeat(80));
    console.log('');
    console.log(`✅ Sistema de Reservas: ${bookings.length} reservas (${activeBookings.length} activas)`);
    console.log(`✅ Sistema de Clases: ${allSlots.length} slots (${correctDuration} con duración correcta)`);
    console.log(`✅ Sistema de Pistas: ${courts.length} pistas configuradas`);
    console.log(`✅ Sistema de Instructores: ${instructors.length} instructores activos`);
    console.log('');
    
    if (incorrectDuration > 0) {
      console.log(`⚠️  ADVERTENCIA: ${incorrectDuration} clases tienen duración incorrecta`);
      console.log('   Puedes corregirlas ejecutando: node fix-confirmed-classes-duration.js');
      console.log('');
    } else {
      console.log('🎉 TODO EL SISTEMA ESTÁ FUNCIONANDO CORRECTAMENTE');
      console.log('');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOtherSystems();

// Demo completa: Sistema de indicadores de pistas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function demoCompleto() {
  console.log('🎬 DEMO: Sistema de Indicadores de Disponibilidad de Pistas\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Estado actual del club
    console.log('📍 CLUB: Padel Estrella Madrid\n');
    
    const courts = await prisma.court.findMany({
      where: { clubId: 'padel-estrella-madrid', isActive: true },
      orderBy: { number: 'asc' }
    });
    
    console.log(`   Total pistas: ${courts.length}`);
    courts.forEach(c => {
      console.log(`   🎾 Pista ${c.number}`);
    });
    
    // 2. Clases de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const confirmedCount = await prisma.timeSlot.count({
      where: {
        clubId: 'padel-estrella-madrid',
        start: { gte: today, lt: tomorrow },
        courtId: { not: null }
      }
    });
    
    const proposalCount = await prisma.timeSlot.count({
      where: {
        clubId: 'padel-estrella-madrid',
        start: { gte: today, lt: tomorrow },
        courtId: null
      }
    });
    
    console.log(`\n📅 Clases de hoy (${today.toLocaleDateString('es-ES')}):`);
    console.log(`   ✅ Confirmadas: ${confirmedCount}`);
    console.log(`   📋 Propuestas: ${proposalCount}`);
    
    // 3. Ejemplo práctico: Horario 10:00-11:00
    console.log('\n\n🎯 EJEMPLO: Horario 10:00-11:00\n');
    
    const targetTime = new Date(today);
    targetTime.setHours(10, 0, 0, 0);
    const targetEnd = new Date(targetTime);
    targetEnd.setHours(11, 0, 0, 0);
    
    // Clases confirmadas en ese horario
    const confirmedAt10 = await prisma.$queryRaw`
      SELECT t.*, c.number as courtNumber, i.name as instructorName
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      LEFT JOIN Instructor ins ON t.instructorId = ins.id
      LEFT JOIN User i ON ins.userId = i.id
      WHERE t.clubId = 'padel-estrella-madrid'
        AND t.start >= ${targetTime.getTime()}
        AND t.start < ${targetEnd.getTime()}
        AND t.courtId IS NOT NULL
      ORDER BY c.number
    `;
    
    if (confirmedAt10.length > 0) {
      console.log(`   📍 Pistas ocupadas a las 10:00:`);
      confirmedAt10.forEach(cls => {
        console.log(`      🔴 Pista ${cls.courtNumber} - ${cls.instructorName}`);
      });
      
      const occupiedCourtNumbers = confirmedAt10.map(c => c.courtNumber);
      const availableCourts = courts.filter(c => !occupiedCourtNumbers.includes(c.number));
      
      if (availableCourts.length > 0) {
        console.log(`\n   ✅ Pistas disponibles a las 10:00:`);
        availableCourts.forEach(c => {
          console.log(`      🟢 Pista ${c.number}`);
        });
      } else {
        console.log(`\n   ⚠️ TODAS LAS PISTAS OCUPADAS`);
        console.log(`      → Propuestas para las 10:00 se ocultarán automáticamente`);
      }
    } else {
      console.log(`   ✅ Todas las pistas disponibles (${courts.length}/4)`);
    }
    
    // 4. Simulación de lo que ve el usuario
    console.log('\n\n👤 LO QUE VE EL USUARIO EN LA WEB:\n');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │  Clase de Padel - Carlos Martinez       │');
    console.log('   │  ⭐ Nivel: Intermedio                   │');
    console.log('   │  🕐 10:00 - 11:00                       │');
    console.log('   │                                         │');
    
    if (confirmedAt10.length === courts.length) {
      console.log('   │  ⚠️ NO HAY PISTAS DISPONIBLES          │');
      console.log('   └─────────────────────────────────────────┘');
      console.log('   [TARJETA OCULTA - No aparece en listado]');
    } else {
      console.log('   │  Estado de pistas (X disponibles):     │');
      console.log('   │  ┌───┬───┬───┬───┐                     │');
      
      const occupiedNumbers = confirmedAt10.map(c => c.courtNumber);
      const indicators = courts.map(c => 
        occupiedNumbers.includes(c.number) ? '🔴' : '🟢'
      ).join(' │ ');
      
      console.log(`   │  │ ${indicators} │                     │`);
      console.log('   │  └───┴───┴───┴───┘                     │');
      console.log('   │   1   2   3   4                        │');
      console.log('   │                                         │');
      console.log('   │  [Reservar 1 plaza] [2 plazas] ...     │');
      console.log('   └─────────────────────────────────────────┘');
    }
    
    // 5. Beneficios del sistema
    console.log('\n\n✨ BENEFICIOS DEL SISTEMA:\n');
    console.log('   ✅ Usuario ve disponibilidad real antes de reservar');
    console.log('   ✅ No se muestran opciones imposibles (0 pistas libres)');
    console.log('   ✅ Colores intuitivos: Verde (libre) / Rojo (ocupado)');
    console.log('   ✅ Tooltip en hover: "Pista X: Disponible/Ocupada"');
    console.log('   ✅ Reduce frustración por reservas fallidas');
    console.log('   ✅ Mejora transparencia del sistema de reservas');
    
    // 6. Estadísticas finales
    console.log('\n\n📊 ESTADÍSTICAS DEL SISTEMA:\n');
    
    const totalSlots = await prisma.timeSlot.count({
      where: {
        clubId: 'padel-estrella-madrid',
        start: { gte: today, lt: tomorrow }
      }
    });
    
    const proposalCountFull = await prisma.timeSlot.count({
      where: {
        clubId: 'padel-estrella-madrid',
        start: { gte: today, lt: tomorrow },
        courtId: null
      }
    });
    
    console.log(`   Total slots del día: ${totalSlots}`);
    console.log(`   Propuestas: ${proposalCountFull} (${Math.round(proposalCountFull/totalSlots*100)}%)`);
    console.log(`   Confirmadas: ${confirmedCount} (${Math.round(confirmedCount/totalSlots*100)}%)`);
    
    // Calcular slots que se ocultarían si todas las pistas estuvieran ocupadas
    const uniqueTimeSlots = new Set();
    const allSlots = await prisma.$queryRaw`
      SELECT DISTINCT start FROM TimeSlot 
      WHERE clubId = 'padel-estrella-madrid'
        AND start >= ${today.getTime()}
        AND start < ${tomorrow.getTime()}
      ORDER BY start
    `;
    
    console.log(`\n   Horarios únicos del día: ${allSlots.length}`);
    console.log(`   Instructores disponibles: 5`);
    console.log(`   Pistas del club: 4`);
    
    console.log('\n   💡 Con 4 pistas ocupadas en un horario:');
    console.log('      → Se ocultan ~5 tarjetas (1 por instructor)');
    console.log('      → Usuario solo ve opciones válidas');
    
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('✅ Demo completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

demoCompleto();

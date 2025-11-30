const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  PASO 1: Eliminando propuestas antiguas...\n');
  
  // Contar propuestas antes de borrar
  const countBefore = await prisma.timeSlot.count({
    where: { courtId: null }
  });
  
  console.log(`📊 Propuestas encontradas: ${countBefore}`);
  
  // Eliminar todas las propuestas (courtId = null)
  const deleted = await prisma.timeSlot.deleteMany({
    where: { courtId: null }
  });
  
  console.log(`✅ ${deleted.count} propuestas eliminadas\n`);
  
  console.log('🏗️  PASO 2: Regenerando propuestas con rangos de nivel...\n');
  
  // Obtener todos los clubes
  const clubs = await prisma.club.findMany();
  console.log(`🏢 Clubes encontrados: ${clubs.length}\n`);
  
  // Obtener instructores con sus rangos de nivel
  const instructors = await prisma.instructor.findMany({
    include: {
      user: true
    }
  });
  
  console.log(`👨‍🏫 Instructores encontrados: ${instructors.length}\n`);
  
  // Función para generar ID único
  function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Función para parsear rangos de nivel
  function parseRanges(instructor) {
    if (!instructor.levelRanges) return null;
    try {
      return JSON.parse(instructor.levelRanges);
    } catch {
      return null;
    }
  }
  
  // Generar clases para los próximos 7 días
  const today = new Date();
  const proposals = [];
  
  for (const club of clubs) {
    console.log(`\n🏢 Generando para club: ${club.name}`);
    
    // Obtener pistas del club
    const courts = await prisma.court.findMany({
      where: { clubId: club.id }
    });
    
    if (courts.length === 0) {
      console.log(`   ⚠️  Sin pistas, saltando...`);
      continue;
    }
    
    // Obtener instructores del club
    const clubInstructors = instructors.filter(i => i.clubId === club.id);
    
    if (clubInstructors.length === 0) {
      console.log(`   ⚠️  Sin instructores, saltando...`);
      continue;
    }
    
    console.log(`   📊 ${courts.length} pistas, ${clubInstructors.length} instructores`);
    
    // Generar para cada día
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      
      // Horarios: 09:00 a 22:00 cada 30 minutos
      for (let hour = 9; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          // Para cada instructor
          for (const instructor of clubInstructors) {
            const ranges = parseRanges(instructor);
            
            // Si el instructor tiene rangos configurados, crear una propuesta por cada rango
            if (ranges && Array.isArray(ranges) && ranges.length > 0) {
              for (const range of ranges) {
                const startTime = new Date(currentDate);
                startTime.setHours(hour, minute, 0, 0);
                
                const endTime = new Date(startTime);
                endTime.setMinutes(endTime.getMinutes() + 60); // 60 minutos
                
                const levelRangeStr = `${range.minLevel}-${range.maxLevel}`;
                
                proposals.push({
                  id: generateId('ts'),
                  clubId: club.id,
                  instructorId: instructor.id,
                  courtId: null, // Es una propuesta
                  start: startTime,
                  end: endTime,
                  maxPlayers: 4,
                  totalPrice: 10.0,
                  instructorPrice: 7.0,
                  courtRentalPrice: 3.0,
                  level: 'abierto',
                  levelRange: levelRangeStr, // ✅ ASIGNAR RANGO
                  category: 'general',
                  genderCategory: null,
                  courtNumber: null,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            } else {
              // Sin rangos, crear una clase "Abierto"
              const startTime = new Date(currentDate);
              startTime.setHours(hour, minute, 0, 0);
              
              const endTime = new Date(startTime);
              endTime.setMinutes(endTime.getMinutes() + 60);
              
              proposals.push({
                id: generateId('ts'),
                clubId: club.id,
                instructorId: instructor.id,
                courtId: null,
                start: startTime,
                end: endTime,
                maxPlayers: 4,
                totalPrice: 10.0,
                instructorPrice: 7.0,
                courtRentalPrice: 3.0,
                level: 'abierto',
                levelRange: null, // Sin rango = Abierto
                category: 'general',
                genderCategory: null,
                courtNumber: null,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
    }
    
    console.log(`   ✅ ${proposals.length} propuestas preparadas para ${club.name}`);
  }
  
  console.log(`\n💾 PASO 3: Guardando ${proposals.length} propuestas en base de datos...\n`);
  
  // Insertar en lotes de 100 para evitar límites de SQLite
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < proposals.length; i += batchSize) {
    const batch = proposals.slice(i, i + batchSize);
    await prisma.timeSlot.createMany({
      data: batch
    });
    inserted += batch.length;
    console.log(`   📝 Insertadas ${inserted}/${proposals.length} propuestas...`);
  }
  
  console.log(`\n✅ COMPLETADO: ${inserted} propuestas creadas con rangos de nivel`);
  
  // Verificar algunas propuestas con rango
  const samplesWithRange = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      levelRange: { not: null }
    },
    take: 3,
    include: {
      instructor: {
        include: { user: true }
      }
    }
  });
  
  console.log('\n📋 Muestras de propuestas con rango:');
  samplesWithRange.forEach((slot, i) => {
    const startDate = new Date(Number(slot.start));
    console.log(`\n  ${i + 1}. ${slot.instructor?.user?.name || 'Sin instructor'}`);
    console.log(`     📅 ${startDate.toLocaleString('es-ES')}`);
    console.log(`     🎯 Rango: ${slot.levelRange}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

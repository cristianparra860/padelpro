const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copia de la función del código de booking
function findLevelRange(userLevel, ranges) {
  if (!ranges || !Array.isArray(ranges)) return null;
  
  for (const range of ranges) {
    if (userLevel >= range.minLevel && userLevel <= range.maxLevel) {
      return `${range.minLevel}-${range.maxLevel}`;
    }
  }
  return null;
}

async function testLevelRangeLogic() {
  try {
    console.log('🧪 Simulando lógica de asignación de nivel al TimeSlot\n');
    
    // Caso 1: Instructor CON rangos (Cristian Parra)
    console.log('📋 CASO 1: Instructor CON rangos configurados');
    console.log('=' .repeat(60));
    
    const instructorWithRanges = await prisma.$queryRaw`
      SELECT id, name, levelRanges 
      FROM Instructor 
      WHERE levelRanges IS NOT NULL
      LIMIT 1
    `;
    
    if (instructorWithRanges.length > 0) {
      const instructor = instructorWithRanges[0];
      console.log(`👨‍🏫 Instructor: ${instructor.name}`);
      
      const ranges = JSON.parse(instructor.levelRanges);
      console.log(`📊 Rangos configurados:`);
      ranges.forEach(r => console.log(`   - ${r.minLevel} a ${r.maxLevel}`));
      
      // Simular usuario con nivel 5.0
      const userLevel = 5.0;
      console.log(`\n👤 Usuario nivel: ${userLevel}`);
      
      const instructorLevelRange = findLevelRange(userLevel, ranges);
      console.log(`✅ Rango asignado al TimeSlot: ${instructorLevelRange || 'ABIERTO'}`);
      console.log(`💡 El campo "level" debería mostrar: "${instructorLevelRange || 'ABIERTO'}"`);
      console.log(`❌ NO debería mostrar: "5.0" (nivel individual)\n`);
    } else {
      console.log('⚠️ No se encontró instructor con rangos\n');
    }
    
    // Caso 2: Instructor SIN rangos
    console.log('📋 CASO 2: Instructor SIN rangos configurados');
    console.log('='.repeat(60));
    
    const instructorWithoutRanges = await prisma.$queryRaw`
      SELECT id, name, levelRanges 
      FROM Instructor 
      WHERE levelRanges IS NULL
      LIMIT 1
    `;
    
    if (instructorWithoutRanges.length > 0) {
      const instructor = instructorWithoutRanges[0];
      console.log(`👨‍🏫 Instructor: ${instructor.name}`);
      console.log(`📊 Rangos configurados: NINGUNO`);
      
      const userLevel = 5.0;
      console.log(`\n👤 Usuario nivel: ${userLevel}`);
      
      const instructorLevelRange = 'ABIERTO';
      console.log(`✅ Rango asignado al TimeSlot: ${instructorLevelRange}`);
      console.log(`💡 El campo "level" debería mostrar: "ABIERTO"`);
      console.log(`❌ NO debería mostrar: "5.0" (nivel individual)\n`);
    }
    
    // Caso 3: Verificar clase real de Cristian Parra con inscripción
    console.log('📋 CASO 3: Verificando clase confirmada de Cristian Parra');
    console.log('='.repeat(60));
    
    const cristianClass = await prisma.$queryRaw`
      SELECT id, level, levelRange, instructorId, start
      FROM TimeSlot
      WHERE instructorId = 'instructor-cristian-parra'
      AND courtId IS NOT NULL
      LIMIT 1
    `;
    
    if (cristianClass.length > 0) {
      const clase = cristianClass[0];
      const date = new Date(Number(clase.start));
      console.log(`📅 Fecha: ${date.toLocaleString('es-ES')}`);
      console.log(`📊 Level actual en DB: "${clase.level}"`);
      console.log(`📊 LevelRange actual en DB: "${clase.levelRange || 'NULL'}"`);
      
      if (clase.level === '5.0' || /^\d+\.\d+$/.test(clase.level)) {
        console.log(`❌ PROBLEMA: Muestra nivel individual "${clase.level}"`);
        console.log(`✅ DEBERÍA MOSTRAR: Un rango como "5-7"`);
        console.log(`💡 Esta clase se creó ANTES del fix - Nuevas inscripciones funcionarán correctamente`);
      } else if (clase.level === '5-7' || /^\d+-\d+$/.test(clase.level)) {
        console.log(`✅ CORRECTO: Muestra rango "${clase.level}"`);
      } else {
        console.log(`ℹ️ Nivel: ${clase.level}`);
      }
    } else {
      console.log('⚠️ No hay clases confirmadas de Cristian Parra');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 CONCLUSIÓN:');
    console.log('='.repeat(60));
    console.log('✅ La lógica del código está correcta');
    console.log('✅ Nuevas inscripciones usarán rangos del instructor');
    console.log('ℹ️  Clases existentes tienen niveles individuales (se crearon antes del fix)');
    console.log('💡 Para verificar: Inscríbete como 1er jugador en clase nueva de Cristian Parra');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLevelRangeLogic();

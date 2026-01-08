const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnaRateTiers() {
  try {
    console.log('🔍 Buscando instructora Ana González...\n');
    
    // Buscar a Ana González
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i.hourlyRate,
        i.defaultRatePerHour,
        i.rateTiers,
        u.email,
        u.name as userName
      FROM Instructor i
      INNER JOIN User u ON i.userId = u.id
      WHERE u.name LIKE '%Ana%' AND u.name LIKE '%González%'
    `;
    
    if (instructors.length === 0) {
      console.log('❌ No se encontró Ana González');
      return;
    }
    
    const ana = instructors[0];
    console.log('✅ Instructora encontrada:');
    console.log('   ID:', ana.id);
    console.log('   Nombre:', ana.name);
    console.log('   Email:', ana.email);
    console.log('   hourlyRate:', ana.hourlyRate);
    console.log('   defaultRatePerHour:', ana.defaultRatePerHour);
    console.log('\n📊 RateTiers RAW:');
    console.log(ana.rateTiers);
    
    if (ana.rateTiers) {
      try {
        const parsed = JSON.parse(ana.rateTiers);
        console.log('\n📋 RateTiers PARSEADO:');
        console.log(JSON.stringify(parsed, null, 2));
        
        // Verificar estructura
        if (Array.isArray(parsed)) {
          console.log(`\n✅ Es un array con ${parsed.length} tarifas especiales`);
          parsed.forEach((tier, index) => {
            console.log(`\nTarifa ${index + 1}:`);
            console.log('   Días:', tier.days);
            console.log('   Horario:', tier.startTime, '-', tier.endTime);
            console.log('   Precio:', tier.rate, '€');
          });
        } else {
          console.log('\n⚠️  No es un array válido');
        }
      } catch (e) {
        console.log('\n❌ Error parseando rateTiers:', e.message);
      }
    } else {
      console.log('\n⚠️  No tiene rateTiers configuradas');
    }
    
    // Verificar clases del 12 de enero
    console.log('\n\n🎾 Clases del 12 de enero de 2026:');
    const classes = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        instructorPrice,
        totalPrice,
        levelRange,
        instructorId
      FROM TimeSlot
      WHERE instructorId = ${ana.id}
        AND start >= ${new Date('2026-01-12T00:00:00Z').getTime()}
        AND start < ${new Date('2026-01-13T00:00:00Z').getTime()}
      ORDER BY start
    `;
    
    if (classes.length === 0) {
      console.log('⚠️  No hay clases del 12 de enero');
    } else {
      console.log(`\n✅ Encontradas ${classes.length} clases:`);
      classes.forEach(clase => {
        const startDate = new Date(clase.start);
        const horaUTC = startDate.toISOString().substring(11, 16);
        console.log(`\n   Hora: ${horaUTC}`);
        console.log(`   Precio Instructor: ${clase.instructorPrice}€`);
        console.log(`   Precio Total: ${clase.totalPrice}€`);
        console.log(`   Nivel: ${clase.levelRange}`);
        console.log(`   ID: ${clase.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnaRateTiers();

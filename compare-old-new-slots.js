const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareSlots() {
  try {
    console.log('\n🔍 COMPARANDO TARJETAS VIEJAS VS NUEVAS\n');
    
    // Obtener TODAS las tarjetas del día 24 a las 06:00 UTC directamente
    const allSlots = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z')
      },
      select: {
        id: true,
        clubId: true,
        start: true,
        end: true,
        level: true,
        genderCategory: true,
        courtId: true,
        instructor: {
          select: {
            id: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    console.log(`📊 Total tarjetas a las 06:00 UTC (Prisma ORM): ${allSlots.length}\n`);
    
    const oldSlots = allSlots.filter(s => s.id.startsWith('ts_'));
    const newSlots = allSlots.filter(s => s.id.startsWith('c'));
    
    console.log(`   Tarjetas VIEJAS (ts_...): ${oldSlots.length}`);
    console.log(`   Tarjetas NUEVAS (c...): ${newSlots.length}\n`);
    
    if (oldSlots.length > 0) {
      console.log('🗑️  TARJETAS VIEJAS:');
      oldSlots.forEach(s => {
        console.log(`   - ${s.instructor?.user?.name || 'Sin instructor'} | ${s.level} | ${s.genderCategory || 'null'}`);
        console.log(`     ID: ${s.id.substring(0, 30)}...`);
        console.log(`     clubId: ${s.clubId}`);
        console.log(`     start: ${s.start.toISOString()}`);
        console.log(`     start type: ${typeof s.start} (${s.start.constructor.name})`);
        console.log('');
      });
    }
    
    if (newSlots.length > 0) {
      console.log('✨ TARJETAS NUEVAS:');
      newSlots.forEach(s => {
        console.log(`   - ${s.instructor?.user?.name || 'Sin instructor'} | ${s.level} | ${s.genderCategory || 'null'}`);
        console.log(`     ID: ${s.id.substring(0, 30)}...`);
        console.log(`     clubId: ${s.clubId}`);
        console.log(`     start: ${s.start.toISOString()}`);
        console.log(`     start type: ${typeof s.start} (${s.start.constructor.name})`);
        console.log('');
      });
    }
    
    // Ahora probar la query SQL RAW que usa el API
    console.log('\n═'.repeat(80));
    console.log('\n🔍 PROBANDO LA QUERY SQL RAW DEL API:\n');
    
    const clubId = 'padel-estrella-madrid';
    const date = '2025-11-24';
    const startISO = date + 'T00:00:00.000Z';
    const endISO = date + 'T23:59:59.999Z';
    
    const query = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
    console.log('Query:', query);
    console.log('Params:', [clubId, startISO, endISO]);
    console.log('');
    
    const sqlResult = await prisma.$queryRawUnsafe(query, clubId, startISO, endISO);
    
    const sqlAt6AM = sqlResult.filter(s => {
      const start = new Date(s.start);
      return start.getUTCHours() === 6 && start.getUTCMinutes() === 0;
    });
    
    console.log(`📊 Resultado SQL: ${sqlResult.length} total, ${sqlAt6AM.length} a las 06:00 UTC\n`);
    
    const sqlOld = sqlAt6AM.filter(s => s.id.startsWith('ts_'));
    const sqlNew = sqlAt6AM.filter(s => s.id.startsWith('c'));
    
    console.log(`   En SQL: ${sqlOld.length} viejas, ${sqlNew.length} nuevas\n`);
    
    if (sqlNew.length === 0 && newSlots.length > 0) {
      console.log('❌ PROBLEMA ENCONTRADO:');
      console.log('   Las tarjetas NUEVAS existen en la DB pero NO aparecen en la query SQL');
      console.log('   Esto significa que el filtro SQL está mal configurado\n');
      
      console.log('🔍 Verificando por qué no aparecen las nuevas:\n');
      newSlots.forEach(s => {
        console.log(`   Tarjeta: ${s.id.substring(0, 20)}...`);
        console.log(`   clubId en DB: "${s.clubId}"`);
        console.log(`   clubId buscado: "${clubId}"`);
        console.log(`   ¿Match?: ${s.clubId === clubId ? '✅ SÍ' : '❌ NO'}`);
        
        const startStr = s.start.toISOString();
        console.log(`   start en DB: "${startStr}"`);
        console.log(`   Rango buscado: "${startISO}" - "${endISO}"`);
        console.log(`   ¿En rango?: ${startStr >= startISO && startStr <= endISO ? '✅ SÍ' : '❌ NO'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareSlots();

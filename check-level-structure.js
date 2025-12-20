const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLevelStructure() {
  console.log('\n🔍 Verificando estructura de nivel en slots del 9 dic:\n');
  
  const startTimestamp = new Date('2025-12-09T09:00:00Z').getTime();
  const endTimestamp = new Date('2025-12-09T10:00:00Z').getTime();
  
  // Usar raw SQL como el API
  const slots = await prisma.$queryRawUnsafe(`
    SELECT 
      ts.id,
      ts.level,
      ts.levelRange,
      ts.start,
      i.id as instructorId,
      u.name as instructorName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE ts.start >= ? AND ts.start < ?
    ORDER BY ts.start ASC
  `, startTimestamp, endTimestamp);

  console.log(`📊 Total slots encontrados: ${slots.length}\n`);

  slots.forEach((s, idx) => {
    console.log(`${idx + 1}. Instructor: ${s.instructorName || 'N/A'}`);
    console.log(`   ID: ${s.id.substring(0, 20)}...`);
    console.log(`   level: ${JSON.stringify(s.level)} (type: ${typeof s.level})`);
    console.log(`   levelRange: ${JSON.stringify(s.levelRange)} (type: ${typeof s.levelRange})`);
    console.log(`   start: ${new Date(Number(s.start)).toISOString()}`);
    
    // Test filtering for user 5.0
    let passesFor5 = false;
    let passesFor6 = false;
    
    // Check 'abierto' (case-insensitive)
    if (typeof s.level === 'string' && s.level.toLowerCase() === 'abierto') {
      passesFor5 = true;
      passesFor6 = true;
    } 
    // Check object ranges
    else if (typeof s.level === 'object' && s.level !== null) {
      const minLevel = parseFloat(s.level.min);
      const maxLevel = parseFloat(s.level.max);
      passesFor5 = (5.0 >= minLevel && 5.0 <= maxLevel);
      passesFor6 = (6.0 >= minLevel && 6.0 <= maxLevel);
    }
    // Check string ranges like "5-7"
    else if (typeof s.level === 'string' && s.level.includes('-')) {
      const [minStr, maxStr] = s.level.split('-');
      const minLevel = parseFloat(minStr);
      const maxLevel = parseFloat(maxStr);
      if (!isNaN(minLevel) && !isNaN(maxLevel)) {
        passesFor5 = (5.0 >= minLevel && 5.0 <= maxLevel);
        passesFor6 = (6.0 >= minLevel && 6.0 <= maxLevel);
      }
    }
    // Check single numeric with ±0.5
    else if (typeof s.level === 'string') {
      const classLevel = parseFloat(s.level);
      if (!isNaN(classLevel)) {
        passesFor5 = Math.abs(5.0 - classLevel) <= 0.5;
        passesFor6 = Math.abs(6.0 - classLevel) <= 0.5;
      }
    }
    
    console.log(`   ✅ User 5.0 can see: ${passesFor5}`);
    console.log(`   ✅ User 6.0 can see: ${passesFor6}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkLevelStructure().catch(console.error);

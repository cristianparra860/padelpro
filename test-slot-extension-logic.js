// Test slot extension logic after booking confirmation
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSlotExtension() {
  console.log('🔍 Testing slot extension and proposal deletion logic...\n');
  
  try {
    // 1. Find a confirmed slot (with courtNumber)
    const confirmedSlots = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber, instructorId, 
             (julianday(end) - julianday(start)) * 24 * 60 as duration_minutes
      FROM TimeSlot 
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC
      LIMIT 5
    `;
    
    console.log('✅ Confirmed slots found:', confirmedSlots.length);
    
    if (confirmedSlots.length > 0) {
      const slot = confirmedSlots[0];
      console.log('\n📋 Example confirmed slot:');
      console.log(`   ID: ${slot.id}`);
      console.log(`   Start: ${new Date(slot.start).toLocaleString()}`);
      console.log(`   End: ${new Date(slot.end).toLocaleString()}`);
      console.log(`   Court: ${slot.courtNumber}`);
      console.log(`   Duration: ${slot.duration_minutes} minutes`);
      
      // 2. Check if there are proposals overlapping with this confirmed slot
      const startDate = new Date(slot.start);
      const endDate = new Date(slot.end);
      
      console.log('\n🔍 Checking for overlapping proposals...');
      const overlappingProposals = await prisma.$queryRaw`
        SELECT id, start, end, instructorId, level, genderCategory,
               (julianday(end) - julianday(start)) * 24 * 60 as duration_minutes
        FROM TimeSlot
        WHERE instructorId = ${slot.instructorId}
        AND courtId IS NULL
        AND (
          (start >= ${startDate.toISOString()} AND start < ${endDate.toISOString()})
          OR (end > ${startDate.toISOString()} AND end <= ${endDate.toISOString()})
          OR (start <= ${startDate.toISOString()} AND end >= ${endDate.toISOString()})
        )
      `;
      
      console.log(`   Found ${overlappingProposals.length} overlapping proposals`);
      
      if (overlappingProposals.length > 0) {
        console.log('\n⚠️ WARNING: Overlapping proposals still exist!');
        overlappingProposals.forEach((prop, idx) => {
          console.log(`   Proposal ${idx + 1}:`);
          console.log(`      ID: ${prop.id}`);
          console.log(`      Time: ${new Date(prop.start).toLocaleTimeString()} - ${new Date(prop.end).toLocaleTimeString()}`);
          console.log(`      Duration: ${prop.duration_minutes} minutes`);
          console.log(`      Level: ${prop.level}`);
        });
        console.log('\n❌ Deletion logic may have failed!');
      } else {
        console.log('   ✅ No overlapping proposals (deletion worked correctly)');
      }
    }
    
    // 3. Check distribution of slot durations
    console.log('\n📊 Slot duration distribution:');
    const durationStats = await prisma.$queryRaw`
      SELECT 
        ROUND((julianday(end) - julianday(start)) * 24 * 60) as duration_minutes,
        COUNT(*) as count,
        CASE WHEN courtNumber IS NULL THEN 'Proposal' ELSE 'Confirmed' END as status
      FROM TimeSlot
      GROUP BY duration_minutes, status
      ORDER BY duration_minutes, status
    `;
    
    console.table(durationStats);
    
    // 4. Check if any 30-min confirmed slots exist (should not after extension)
    const confirmed30min = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      AND (julianday(end) - julianday(start)) * 24 * 60 < 31
    `;
    
    const count30min = confirmed30min[0]?.count || 0;
    
    if (count30min > 0) {
      console.log(`\n⚠️ WARNING: Found ${count30min} confirmed slots with 30-min duration!`);
      console.log('   Extension logic may not be working.');
    } else {
      console.log('\n✅ All confirmed slots are 60 minutes (extension working)');
    }
    
  } catch (error) {
    console.error('❌ Error testing slot extension:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSlotExtension();

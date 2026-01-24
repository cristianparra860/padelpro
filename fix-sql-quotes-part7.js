const fs = require('fs');
const path = 'src/app/api/classes/book/route.ts';
const raw = fs.readFileSync(path, 'utf8');
let lines = raw.split(/\r?\n/);

function replaceInLine(lineNum, oldStr, newStr) {
    const index = lineNum - 1;
    if (lines[index] && lines[index].includes(oldStr)) {
        lines[index] = lines[index].replace(oldStr, newStr);
        console.log(`✅ Line ${lineNum} updated.`);
    } else {
        console.log(`❌ Line ${lineNum} NOT matched. Content: ${lines[index] ? lines[index].trim() : 'EOF'}`);
    }
}

console.log('Starting fixes part 7 (INSERT & UPDATE)...');

// Fix 1: INSERT INTO "Booking" columns
replaceInLine(895, 'INSERT INTO "Booking" (id, "userId", "timeSlotId", groupSize, "status", "amountBlocked", paidWithPoints, pointsUsed, isRecycled, "createdAt", updatedAt)',
    'INSERT INTO "Booking" ("id", "userId", "timeSlotId", "groupSize", "status", "amountBlocked", "paidWithPoints", "pointsUsed", "isRecycled", "createdAt", "updatedAt")');

// Fix 2: INSERT VALUES (booleans)
// Original: VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${Number(groupSize) || 1}, ${bookingStatus}, ${creditsToBlock}, ${usePoints ? 1 : 0}, ${pointsToCharge}, 0, NOW(), NOW())
// Need to change usePoints ternary and 0 to booleans
replaceInLine(896, '${usePoints ? 1 : 0}', '${usePoints ? true : false}');
replaceInLine(896, ', 0, NOW()', ', false, NOW()');
// Assuming 0 meant false for isRecycled? Or is it referring to isRecycledSlot variable?
// The log says `isRecycled=${isRecycledSlot}`, but the code passed `0`. I will change it to `${isRecycledSlot}` if I can, but `false` is safer to match the `0`.
// Actually, looking at the code in view_file, line 892 says `isRecycled=${isRecycledSlot}`. The insert passed `0` (hardcoded). 
// If I assume `false` is what was intended (since 0 usually is false), I'll stick with `false`.

// Fix 3: UPDATE User points
replaceInLine(910, 'SET points = points -', 'SET "points" = "points" -');
replaceInLine(910, '"updatedAt" = NOW()', '"updatedAt" = NOW()'); // Just to be sure, likely already quoted based on previous

// Fix 4: UPDATE User blockedPoints
replaceInLine(918, 'SET blockedPoints = blockedPoints +', 'SET "blockedPoints" = "blockedPoints" +');

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixes part 7 applied.');

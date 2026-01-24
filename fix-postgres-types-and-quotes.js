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

console.log('Starting fixes...');

// 1. cancelOtherBookingsOnSameDay
replaceInLine(63, '${startTimestamp}', '${startOfDayDate}');
replaceInLine(64, '${endTimestamp}', '${endOfDayDate}');

// 2. assignCourtToClass - occupiedByClasses
// Quotes first
replaceInLine(307, 'courtNumber IS NOT NULL', '"courtNumber" IS NOT NULL');
// Types
replaceInLine(309, '${endTimestamp}', '${slotEnd}');
replaceInLine(310, '${startTimestamp}', '${slotStart}');

// 3. assignCourtToClass - occupiedBySchedule
// Quotes and logic
replaceInLine(320, 'isOccupied = 1', '"isOccupied" = true');
replaceInLine(321, 'startTime', '"startTime"');
replaceInLine(321, '${endTimestamp}', '${slotEnd}');
replaceInLine(322, 'endTime', '"endTime"');
replaceInLine(322, '${startTimestamp}', '${slotStart}');

// 4. Club courts
replaceInLine(340, 'isActive = 1', '"isActive" = true');

// 5. INSERT CourtSchedule
// Values match positions: id, courtId, startTime, endTime, isOccupied, createdAt, updatedAt
// Original: VALUES (${courtScheduleId}, ${assignedCourtId}, ${startTimestamp}, ${endTimestamp}, 1, NOW(), NOW())
// We need to replace variables AND value 1
// Safest to replace the whole line part or specific fragments
replaceInLine(407, '${startTimestamp}', '${slotStart}');
replaceInLine(407, '${endTimestamp}', '${slotEnd}');
replaceInLine(407, ', 1,', ', true,');

// 6. INSERT InstructorSchedule
// Original: VALUES (${instructorScheduleId}, ${instructorId}, ${startTimestamp}, ${endTimestamp}, 1, NOW(), NOW())
replaceInLine(414, '${startTimestamp}', '${slotStart}');
replaceInLine(414, '${endTimestamp}', '${slotEnd}');
replaceInLine(414, ', 1,', ', true,');

// 7. POST - confirmedBookingsToday
replaceInLine(500, '${startTimestamp}', '${startOfDayDate}');
replaceInLine(501, '${endTimestamp}', '${endOfDayDate}');

// 8. POST - duplicateStartTimeClass
replaceInLine(553, '${slotStartTime}', '${slotDate}');

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixes applied.');

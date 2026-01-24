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

console.log('Starting fixes part 5 (final)...');

// Fix 1: occupiedByClasses inside race logic
replaceInLine(1289, 'courtNumber IS NOT NULL', '"courtNumber" IS NOT NULL');
replaceInLine(1293, 'GROUP BY courtNumber', 'GROUP BY "courtNumber"');

// Fix 2: occupiedBySchedule inside race logic
replaceInLine(1302, 'isOccupied = 1', '"isOccupied" = true');

// Fix 3: clubCourts inside race logic
replaceInLine(1316, 'isActive = 1', '"isActive" = true');

fs.writeFileSync(path, lines.join('\n'));
console.log('Final fixes part 5 applied.');

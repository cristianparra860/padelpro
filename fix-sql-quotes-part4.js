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

console.log('Starting fixes part 4...');

// Fix 1: duplicateBooking query logic
replaceInLine(814, 'AND groupSize =', 'AND "groupSize" =');
replaceInLine(815, 'AND status IN', 'AND "status" IN');

// Fix 2: instructorSubsidy query logic
replaceInLine(833, 'AND groupSize =', 'AND "groupSize" =');
replaceInLine(834, 'isInstructorSubsidy = 1', '"isInstructorSubsidy" = true');

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixes part 4 applied.');

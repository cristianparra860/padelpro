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

console.log('Starting fixes part 3...');

// Fix 1: recycledBookingsForModality queries
replaceInLine(666, 'AND groupSize =', 'AND "groupSize" =');
replaceInLine(668, 'AND isRecycled = 1', 'AND "isRecycled" = true');

// Fix 2: existingBookingsForModality queries
replaceInLine(687, 'AND groupSize =', 'AND "groupSize" =');
replaceInLine(688, 'AND status IN', 'AND "status" IN');

fs.writeFileSync(path, lines.join('\n'));
console.log('Final fixes applied.');

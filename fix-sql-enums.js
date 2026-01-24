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

console.log('Starting fixes part 8 (Enum Casts)...');

// Fix 1: INSERT VALUES parameter cast
// Original: VALUES (..., ${bookingStatus}, ...)
// New: VALUES (..., ${bookingStatus}::"BookingStatus", ...)
replaceInLine(896, '${bookingStatus}', '${bookingStatus}::"BookingStatus"');

// Fix 2: Proactively cast literals in UPDATEs to be safe?
// 'CANCELLED' -> 'CANCELLED'::"BookingStatus"
// This might be safer.
lines.forEach((line, idx) => {
    if (line.includes(`"status" = 'CANCELLED'`)) {
        lines[idx] = line.replace(`"status" = 'CANCELLED'`, `"status" = 'CANCELLED'::"BookingStatus"`);
        console.log(`✅ Line ${idx + 1} updated (literal cast).`);
    }
});

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixes part 8 applied.');

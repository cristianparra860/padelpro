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

console.log('Starting fixes part 6...');

// Fix 1: Unquoted groupSize in queryRaw
replaceInLine(2260, 'b.groupSize', 'b."groupSize"');

// Fix 2: Unquoted points in UPDATE User
replaceInLine(1847, 'SET points = points +', 'SET "points" = "points" +');

// Fix 3: Unquoted blockedPoints in UPDATE User
replaceInLine(1884, 'SET blockedPoints = blockedPoints -', 'SET "blockedPoints" = "blockedPoints" -');

// Fix 4: Scan for unquoted Table names (rare but possible)
lines.forEach((line, idx) => {
    // Regex for FROM Booking / JOIN Booking / UPDATE Booking unquoted
    // Note: We use simple search to avoid complex regex in JS for now
    if (line.match(/(FROM|JOIN|UPDATE|INTO)\s+Booking\b/)) {
        console.log(`⚠️ Potential unquoted Booking at line ${idx + 1}: ${line.trim()}`);
        lines[idx] = line.replace(/Booking\b/g, '"Booking"');
        console.log(`✅ Quote added to Booking at line ${idx + 1}`);
    }

    // Also check for User, TimeSlot, etc.
    if (line.match(/(FROM|JOIN|UPDATE|INTO)\s+User\b/)) {
        console.log(`⚠️ Potential unquoted User at line ${idx + 1}: ${line.trim()}`);
        lines[idx] = line.replace(/User\b/g, '"User"');
        console.log(`✅ Quote added to User at line ${idx + 1}`);
    }

    if (line.match(/(FROM|JOIN|UPDATE|INTO)\s+timeSlot\b/i)) { // case insensitive check for camelCase
        if (line.includes("timeSlot") && !line.includes('"TimeSlot"')) {
            // This is tricky, might be alias. But if it's table name position...
            // Let's rely on specific fixes above unless we find something obvious
        }
    }
});

fs.writeFileSync(path, lines.join('\n'));
console.log('Final fixes part 6 applied.');

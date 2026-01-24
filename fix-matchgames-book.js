const fs = require('fs');
const path = 'src/app/api/matchgames/book/route.ts';
const raw = fs.readFileSync(path, 'utf8');
let content = raw;

// Fix 1: cancelOtherActivitiesOnSameDay query
// We use a regex to match the query block loosely and replace it
const oldQuery1 = `    SELECT b.id, b."userId", b."timeSlotId", b."amountBlocked", b.status, b."paidWithPoints", b."pointsUsed", ts.start
    FROM "Booking" b
    JOIN "TimeSlot" ts ON b."timeSlotId" = ts.id
    WHERE b."userId" = \${userId}
    AND b.status IN ('PENDING', 'CONFIRMED')
    AND ts.start >= \${startTimestamp}
    AND ts.start <= \${endTimestamp}`;

const newQuery1 = `    SELECT b."id", b."userId", b."timeSlotId", b."amountBlocked", b."status", b."paidWithPoints", b."pointsUsed", ts."start"
    FROM "Booking" b
    JOIN "TimeSlot" ts ON b."timeSlotId" = ts."id"
    WHERE b."userId" = \${userId}
    AND b."status" IN ('PENDING'::"BookingStatus", 'CONFIRMED'::"BookingStatus")
    AND ts."start" >= \${startOfDayDate}
    AND ts."start" <= \${endOfDayDate}`;

// We need to be careful with exact whitespace matching. 
// A safer approach for strings that span multiple lines is to replace unique parts.

// Pattern 1: b.status IN ...
content = content.replace(
    /AND b.status IN \('PENDING', 'CONFIRMED'\)/g,
    `AND b."status" IN ('PENDING'::"BookingStatus", 'CONFIRMED'::"BookingStatus")`
);

// Pattern 2: ts.start >= ${startTimestamp}
// We want to replace startTimestamp with startOfDayDate (which are Date objects in lines 93-94)
// Note: In the source code (lines 107-108), it uses startTimestamp (number).
content = content.replace(
    /AND ts.start >= \${startTimestamp}/g,
    `AND ts."start" >= \${startOfDayDate}`
);
content = content.replace(
    /AND ts.start <= \${endTimestamp}/g,
    `AND ts."start" <= \${endOfDayDate}`
);

// Pattern 3: Unquoted columns in select/join
content = content.replace(
    /b.id, b."userId"/,
    `b."id", b."userId"` // Quote id
);
content = content.replace(
    /b.amountBlocked, b.status/,
    `b."amountBlocked", b."status"` // Quote amountBlocked and status
);
content = content.replace(
    /= ts.id/,
    `= ts."id"` // Quote ts.id
);


// Fix 2: occupiedCourtsByClasses query (Lines ~980)
// Original:
// SELECT DISTINCT courtNumber FROM TimeSlot
// WHERE clubId = ${matchGame.clubId}
// AND courtNumber IS NOT NULL
// AND start >= ${startTimestamp}
// AND end <= ${endTimestamp}

const oldQuery2Block = `SELECT DISTINCT courtNumber FROM TimeSlot`;
const newQuery2Block = `SELECT DISTINCT "courtNumber" FROM "TimeSlot"`;
content = content.replace(oldQuery2Block, newQuery2Block);

content = content.replace(
    /WHERE clubId = \${matchGame.clubId}/,
    `WHERE "clubId" = \${matchGame.clubId}`
);

content = content.replace(
    /AND courtNumber IS NOT NULL/,
    `AND "courtNumber" IS NOT NULL`
);

// Fix date comparison in occupiedCourtsByClasses
// startTimestamp is number here (line 975). We need "start" >= new Date(startTimestamp)
content = content.replace(
    /AND start >= \${startTimestamp}/,
    `AND "start" >= \${new Date(startTimestamp)}`
);

content = content.replace(
    /AND end <= \${endTimestamp}/,
    `AND "end" <= \${new Date(endTimestamp)}`
);

fs.writeFileSync(path, content);
console.log('Applied fixes to src/app/api/matchgames/book/route.ts');

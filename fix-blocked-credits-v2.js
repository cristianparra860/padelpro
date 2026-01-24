const fs = require('fs');
const path = 'src/lib/blockedCredits.ts';
const raw = fs.readFileSync(path, 'utf8');
let content = raw;

// 1. timeSlot -> TimeSlot (Relation Key & Property)
// Replace keys in Prisma queries
content = content.replace(/timeSlot:\s*{/g, 'TimeSlot: {');
content = content.replace(/timeSlot:\s*true/g, 'TimeSlot: true');

// Replace property access on result objects (booking.timeSlot -> booking.TimeSlot)
content = content.replace(/booking\.timeSlot/g, 'booking.TimeSlot');
content = content.replace(/booking\.timeSlot\?/g, 'booking.TimeSlot?');

// 2. bookings -> Booking (Relation Key & Property on TimeSlot)
// In markSlotAsRecycled function
content = content.replace(/bookings:\s*true/g, 'Booking: true'); // include: { bookings: true }
content = content.replace(/timeSlot\.bookings/g, 'timeSlot.Booking'); // timeSlot.bookings

// 3. activeBookings query in resetSlotCategoryIfEmpty
// It uses raw query with "Booking". That looks correct as table name.
// But we should check if column "timeSlotId" is quoted.
// Line 362: WHERE "timeSlotId" = ... -> Correct.

fs.writeFileSync(path, content);
console.log('Fixed src/lib/blockedCredits.ts');

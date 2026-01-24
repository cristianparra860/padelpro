const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Aplicando correcciones de PostgreSQL...');

// Reemplazar nombres de tablas sin comillas
const tableReplacements = [
    { from: /FROM TimeSlot/g, to: 'FROM "TimeSlot"' },
    { from: /JOIN TimeSlot/g, to: 'JOIN "TimeSlot"' },
    { from: /FROM Booking/g, to: 'FROM "Booking"' },
    { from: /JOIN Booking/g, to: 'JOIN "Booking"' },
    { from: /FROM Court/g, to: 'FROM "Court"' },
    { from: /JOIN Court/g, to: 'JOIN "Court"' },
    { from: /FROM User/g, to: 'FROM "User"' },
    { from: /JOIN User/g, to: 'JOIN "User"' },
    { from: /FROM Instructor/g, to: 'FROM "Instructor"' },
    { from: /JOIN Instructor/g, to: 'JOIN "Instructor"' },
    { from: /FROM CourtSchedule/g, to: 'FROM "CourtSchedule"' },
    { from: /JOIN CourtSchedule/g, to: 'JOIN "CourtSchedule"' },
    { from: /UPDATE TimeSlot/g, to: 'UPDATE "TimeSlot"' },
    { from: /UPDATE Booking/g, to: 'UPDATE "Booking"' },
    { from: /INSERT INTO TimeSlot/g, to: 'INSERT INTO "TimeSlot"' },
    { from: /INSERT INTO Booking/g, to: 'INSERT INTO "Booking"' },
    { from: /INSERT INTO CourtSchedule/g, to: 'INSERT INTO "CourtSchedule"' },
    { from: /INSERT INTO InstructorSchedule/g, to: 'INSERT INTO "InstructorSchedule"' },
    { from: /INSERT INTO Transaction/g, to: 'INSERT INTO "Transaction"' },
];

// Reemplazar nombres de columnas comunes sin comillas (solo en contextos SQL)
const columnReplacements = [
    { from: /\.userId/g, to: '."userId"' },
    { from: /\.timeSlotId/g, to: '."timeSlotId"' },
    { from: /\.instructorId/g, to: '."instructorId"' },
    { from: /\.courtId/g, to: '."courtId"' },
    { from: /\.clubId/g, to: '."clubId"' },
    { from: /\.amountBlocked/g, to: '."amountBlocked"' },
    { from: /\.paidWithPoints/g, to: '."paidWithPoints"' },
    { from: /\.pointsUsed/g, to: '."pointsUsed"' },
    { from: /\.courtNumber/g, to: '."courtNumber"' },
    { from: /\.maxPlayers/g, to: '."maxPlayers"' },
    { from: /\.totalPrice/g, to: '."totalPrice"' },
    { from: /\.groupSize/g, to: '."groupSize"' },
    { from: /\.levelRange/g, to: '."levelRange"' },
    { from: /\.genderCategory/g, to: '."genderCategory"' },
    { from: /\.createdAt/g, to: '."createdAt"' },
    { from: /\.updatedAt/g, to: '."updatedAt"' },
    { from: /\.startTime/g, to: '."startTime"' },
    { from: /\.endTime/g, to: '."endTime"' },
    { from: /\.isOccupied/g, to: '."isOccupied"' },
];

// Aplicar reemplazos de tablas
tableReplacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
        console.log(`  ✓ Reemplazando ${matches.length} ocurrencias de ${from}`);
        content = content.replace(from, to);
    }
});

// Aplicar reemplazos de columnas
columnReplacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
        console.log(`  ✓ Reemplazando ${matches.length} ocurrencias de ${from}`);
        content = content.replace(from, to);
    }
});

// Reemplazar datetime('now') por NOW()
content = content.replace(/datetime\('now'\)/g, 'NOW()');
console.log(`  ✓ Reemplazando datetime('now') por NOW()`);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Resumen:');
console.log('  - Tablas corregidas: TimeSlot, Booking, Court, User, Instructor, CourtSchedule');
console.log('  - Columnas corregidas: userId, timeSlotId, courtId, etc.');
console.log('  - Funciones SQL: datetime() → NOW()');

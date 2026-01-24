const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Aplicando correcciones de PostgreSQL solo en consultas SQL...');

// Función para corregir solo dentro de template literals SQL
function fixSQLQueries(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Reemplazar nombres de tablas
        fixed = fixed.replace(/FROM TimeSlot(?!\w)/g, 'FROM "TimeSlot"');
        fixed = fixed.replace(/JOIN TimeSlot(?!\w)/g, 'JOIN "TimeSlot"');
        fixed = fixed.replace(/UPDATE TimeSlot(?!\w)/g, 'UPDATE "TimeSlot"');
        fixed = fixed.replace(/INSERT INTO TimeSlot(?!\w)/g, 'INSERT INTO "TimeSlot"');

        fixed = fixed.replace(/FROM Booking(?!\w)/g, 'FROM "Booking"');
        fixed = fixed.replace(/JOIN Booking(?!\w)/g, 'JOIN "Booking"');
        fixed = fixed.replace(/UPDATE Booking(?!\w)/g, 'UPDATE "Booking"');
        fixed = fixed.replace(/INSERT INTO Booking(?!\w)/g, 'INSERT INTO "Booking"');

        fixed = fixed.replace(/FROM Court(?!\w)/g, 'FROM "Court"');
        fixed = fixed.replace(/JOIN Court(?!\w)/g, 'JOIN "Court"');

        fixed = fixed.replace(/FROM User(?!\w)/g, 'FROM "User"');
        fixed = fixed.replace(/JOIN User(?!\w)/g, 'JOIN "User"');

        fixed = fixed.replace(/FROM Instructor(?!\w)/g, 'FROM "Instructor"');
        fixed = fixed.replace(/JOIN Instructor(?!\w)/g, 'JOIN "Instructor"');

        fixed = fixed.replace(/FROM CourtSchedule(?!\w)/g, 'FROM "CourtSchedule"');
        fixed = fixed.replace(/JOIN CourtSchedule(?!\w)/g, 'JOIN "CourtSchedule"');
        fixed = fixed.replace(/INSERT INTO CourtSchedule(?!\w)/g, 'INSERT INTO "CourtSchedule"');

        fixed = fixed.replace(/FROM InstructorSchedule(?!\w)/g, 'FROM "InstructorSchedule"');
        fixed = fixed.replace(/INSERT INTO InstructorSchedule(?!\w)/g, 'INSERT INTO "InstructorSchedule"');

        fixed = fixed.replace(/FROM Transaction(?!\w)/g, 'FROM "Transaction"');
        fixed = fixed.replace(/INSERT INTO Transaction(?!\w)/g, 'INSERT INTO "Transaction"');

        // Reemplazar datetime('now') por NOW()
        fixed = fixed.replace(/datetime\('now'\)/g, 'NOW()');

        // Reemplazar nombres de columnas en contexto SQL (después de punto en SELECT/WHERE)
        // Solo en patrones como "b.userId" o "ts.courtId"
        fixed = fixed.replace(/\b([a-z]+)\.userId\b/g, '$1."userId"');
        fixed = fixed.replace(/\b([a-z]+)\.timeSlotId\b/g, '$1."timeSlotId"');
        fixed = fixed.replace(/\b([a-z]+)\.instructorId\b/g, '$1."instructorId"');
        fixed = fixed.replace(/\b([a-z]+)\.courtId\b/g, '$1."courtId"');
        fixed = fixed.replace(/\b([a-z]+)\.clubId\b/g, '$1."clubId"');
        fixed = fixed.replace(/\b([a-z]+)\.amountBlocked\b/g, '$1."amountBlocked"');
        fixed = fixed.replace(/\b([a-z]+)\.paidWithPoints\b/g, '$1."paidWithPoints"');
        fixed = fixed.replace(/\b([a-z]+)\.pointsUsed\b/g, '$1."pointsUsed"');
        fixed = fixed.replace(/\b([a-z]+)\.courtNumber\b/g, '$1."courtNumber"');
        fixed = fixed.replace(/\b([a-z]+)\.maxPlayers\b/g, '$1."maxPlayers"');
        fixed = fixed.replace(/\b([a-z]+)\.totalPrice\b/g, '$1."totalPrice"');
        fixed = fixed.replace(/\b([a-z]+)\.groupSize\b/g, '$1."groupSize"');
        fixed = fixed.replace(/\b([a-z]+)\.levelRange\b/g, '$1."levelRange"');
        fixed = fixed.replace(/\b([a-z]+)\.genderCategory\b/g, '$1."genderCategory"');
        fixed = fixed.replace(/\b([a-z]+)\.createdAt\b/g, '$1."createdAt"');
        fixed = fixed.replace(/\b([a-z]+)\.updatedAt\b/g, '$1."updatedAt"');
        fixed = fixed.replace(/\b([a-z]+)\.startTime\b/g, '$1."startTime"');
        fixed = fixed.replace(/\b([a-z]+)\.endTime\b/g, '$1."endTime"');
        fixed = fixed.replace(/\b([a-z]+)\.isOccupied\b/g, '$1."isOccupied"');

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixSQLQueries(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Solo se corrigieron las consultas SQL dentro de prisma.$queryRaw y prisma.$executeRaw');
console.log('   El código TypeScript normal no fue modificado.');

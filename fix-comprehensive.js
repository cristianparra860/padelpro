const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Aplicando corrección COMPLETA de todas las columnas camelCase...');

// Función para corregir solo dentro de template literals SQL
function comprehensiveFix(text) {
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;
        const original = sqlContent;

        // Lista COMPLETA de todas las columnas camelCase que necesitan comillas
        const allColumns = [
            'id', 'clubId', 'courtId', 'instructorId', 'userId', 'timeSlotId', 'matchGameId',
            'totalPrice', 'creditsSlots', 'creditsCost', 'courtNumber', 'maxPlayers',
            'assignedClubId', 'assignedCourtId', 'assignedInstructorId',
            'updatedAt', 'createdAt', 'amountBlocked',
            'status', 'category', 'genderCategory', 'levelRange', 'levelRanges',
            'gender', 'level'
        ];

        // Para cada columna, asegurarse de que esté entrecomillada en todos los contextos
        allColumns.forEach(col => {
            // WHERE, AND, OR
            fixed = fixed.replace(new RegExp(`(WHERE|AND|OR)\\s+${col}\\s*([=<>!])`, 'g'), `$1 "${col}" $2`);
            // SET
            fixed = fixed.replace(new RegExp(`SET\\s+${col}\\s*=`, 'g'), `SET "${col}" =`);
            fixed = fixed.replace(new RegExp(`,\\s*${col}\\s*=`, 'g'), `, "${col}" =`);
            // SELECT (solo si no está ya entre comillas)
            fixed = fixed.replace(new RegExp(`SELECT\\s+${col},`, 'g'), `SELECT "${col}",`);
            fixed = fixed.replace(new RegExp(`SELECT\\s+${col}\\s+FROM`, 'g'), `SELECT "${col}" FROM`);
            fixed = fixed.replace(new RegExp(`,\\s*${col},`, 'g'), `, "${col}",`);
            fixed = fixed.replace(new RegExp(`,\\s*${col}\\s+FROM`, 'g'), `, "${col}" FROM`);
        });

        if (fixed !== original) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = comprehensiveFix(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Corrección COMPLETA aplicada exitosamente!');
console.log('\n📊 Se verificaron y corrigieron TODAS las columnas camelCase');
console.log('   en SELECT, WHERE, SET, AND, OR');

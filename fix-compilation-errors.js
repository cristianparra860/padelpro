const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo errores críticos de compilación...');

// 1. Corregir ReferenceError: slotPrice is not defined
// Buscamos el bloque donde se usa slotPrice y añadimos la obtención del precio
const slotPricePattern = /const userAfterCancel = await prisma\.user\.findUnique\(\{\s*where: \{ id: userId \},\s*select: \{ credits: true, blockedCredits: true, points: true, blockedPoints: true \}\s*\}\);/g;

if (content.match(slotPricePattern)) {
    content = content.replace(slotPricePattern, `
        // 💰 Obtener precio para el log (Fix slotPrice undefined)
        const priceDataForLog = await prisma.$queryRaw\`SELECT "creditsCost" FROM "TimeSlot" WHERE "id" = \${timeSlotId}\` as any[];
        const slotPrice = Number(priceDataForLog[0]?.creditsCost) || 0;

        const userAfterCancel = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true, blockedCredits: true, points: true, blockedPoints: true }
        });`);
    console.log('  ✓ Corregido ReferenceError: slotPrice');
}

// 2. Corregir TypeError: "charge" no es un TransactionAction válido
// Reemplazar 'charge' por 'subtract'
content = content.replace(/action: 'charge',/g, "action: 'subtract',");
console.log('  ✓ Corregido TypeError: action "charge" -> "subtract"');

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');

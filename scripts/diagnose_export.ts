
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Diagnosing CourtSchedule data...')

    // Fetch raw if possible or just try-catch row by row
    // Since we can't use $queryRaw easily with unknown schema mapping issues, we try to fetch all.
    // If fetchAll fails, we try to take 1 by 1 to find the bad apple.

    const count = await prisma.courtSchedule.count()
    console.log(`Found ${count} records. Checking integrity...`)

    for (let i = 0; i < count; i++) {
        try {
            const item = await prisma.courtSchedule.findFirst({ skip: i, take: 1 })
            // console.log(`[${i}] OK: ${item?.id}`)
        } catch (e) {
            console.error(`❌ Error at index ${i}:`, e)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

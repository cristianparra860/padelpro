
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Clearing all tables in Supabase database...')

    // Delete in reverse dependency order to avoid FK constraint violations
    await prisma.qRSession.deleteMany()
    await prisma.impersonationLog.deleteMany()
    await prisma.instructorRestriction.deleteMany()
    await prisma.instructorAvailability.deleteMany()
    await prisma.clubSchedule.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.matchGameBooking.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.matchGame.deleteMany()
    await prisma.matchPlayer.deleteMany()
    await prisma.match.deleteMany()
    await prisma.timeSlot.deleteMany()
    await prisma.instructor.deleteMany()
    await prisma.courtPriceSlot.deleteMany()
    await prisma.court.deleteMany()
    await prisma.user.deleteMany()
    await prisma.club.deleteMany()
    await prisma.admin.deleteMany()

    console.log('✅ All tables cleared successfully!')
}

main()
    .catch(e => {
        console.error('❌ Clear failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

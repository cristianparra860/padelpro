
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log('📦 Starting data export from SQLite...')

    const data: any = {}

    // Order matters for Foreign Keys during IMPORT, but for EXPORT we can just dump everything independently
    // We will handle insertion order in the import script.

    console.log(' - Exporting Admins...')
    data.admins = await prisma.admin.findMany()

    console.log(' - Exporting Clubs...')
    data.clubs = await prisma.club.findMany()

    console.log(' - Exporting Users...')
    data.users = await prisma.user.findMany()

    console.log(' - Exporting Courts...')
    data.courts = await prisma.court.findMany()

    console.log(' - Exporting CourtPriceSlots...')
    data.courtPriceSlots = await prisma.courtPriceSlot.findMany()

    console.log(' - Exporting Instructors...')
    data.instructors = await prisma.instructor.findMany()

    console.log(' - Exporting TimeSlots...')
    data.timeSlots = await prisma.timeSlot.findMany()

    console.log(' - Exporting Matches...')
    data.matches = await prisma.match.findMany()

    console.log(' - Exporting MatchGames...')
    data.matchGames = await prisma.matchGame.findMany()

    console.log(' - Exporting Bookings (Class)...')
    data.bookings = await prisma.booking.findMany()

    console.log(' - Exporting MatchGameBookings...')
    data.matchGameBookings = await prisma.matchGameBooking.findMany()

    console.log(' - Exporting MatchPlayers...')
    data.matchPlayers = await prisma.matchPlayer.findMany()

    console.log(' - Exporting Schedules & Availability...')
    data.clubSchedules = await prisma.clubSchedule.findMany()
    data.instructorAvailability = await prisma.instructorAvailability.findMany()
    data.instructorRestrictions = await prisma.instructorRestriction.findMany()
    // data.courtSchedules = await prisma.courtSchedule.findMany()
    // data.instructorSchedules = await prisma.instructorSchedule.findMany()
    data.courtSchedules = []
    data.instructorSchedules = []

    console.log(' - Exporting Transactions...')
    data.transactions = await prisma.transaction.findMany()

    console.log(' - Exporting Logs/Sessions...')
    data.impersonationLogs = await prisma.impersonationLog.findMany()
    data.qrSessions = await prisma.qRSession.findMany()

    const outputPath = path.join(process.cwd(), 'prisma', 'migration_data.json')
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))

    console.log(`✅ Data exported successfully to: ${outputPath}`)

    // Print some stats
    Object.keys(data).forEach(key => {
        console.log(`   - ${key}: ${data[key].length} records`)
    })
}

main()
    .catch(e => {
        console.error('❌ Export failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

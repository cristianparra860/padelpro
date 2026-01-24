
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting data import to Supabase (PostgreSQL)...')

    const dataPath = path.join(process.cwd(), 'prisma', 'migration_data.json')
    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const data = JSON.parse(rawData)

    // Import order matters for Foreign Keys!
    // Dependency hierarchy: Admin → Club → User → Court/Instructor → TimeSlot/Match/MatchGame → Bookings → Transactions

    console.log(' - Importing Admins...')
    if (data.admins.length > 0) {
        const admins = data.admins.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.admin.createMany({ data: admins, skipDuplicates: true })
    }

    console.log(' - Importing Clubs...')
    if (data.clubs.length > 0) {
        const clubs = data.clubs.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.club.createMany({ data: clubs, skipDuplicates: true })
    }

    console.log(' - Importing Users...')
    if (data.users.length > 0) {
        const users = data.users.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.user.createMany({ data: users, skipDuplicates: true })
    }

    console.log(' - Importing Courts...')
    if (data.courts.length > 0) {
        const courts = data.courts.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.court.createMany({ data: courts, skipDuplicates: true })
    }

    console.log(' - Importing CourtPriceSlots...')
    if (data.courtPriceSlots.length > 0) {
        const slots = data.courtPriceSlots.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.courtPriceSlot.createMany({ data: slots, skipDuplicates: true })
    }

    console.log(' - Importing Instructors...')
    if (data.instructors.length > 0) {
        const instructors = data.instructors.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.instructor.createMany({ data: instructors, skipDuplicates: true })
    }

    console.log(' - Importing TimeSlots...')
    if (data.timeSlots.length > 0) {
        const slots = data.timeSlots.map((item: any) => ({
            ...item,
            start: new Date(item.start),
            end: new Date(item.end),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.timeSlot.createMany({ data: slots, skipDuplicates: true })
    }

    console.log(' - Importing Matches...')
    if (data.matches.length > 0) {
        const matches = data.matches.map((item: any) => ({
            ...item,
            startTime: new Date(item.startTime),
            endTime: new Date(item.endTime),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.match.createMany({ data: matches, skipDuplicates: true })
    }

    console.log(' - Importing MatchPlayers...')
    if (data.matchPlayers && data.matchPlayers.length > 0) {
        const players = data.matchPlayers.map((item: any) => ({
            ...item
        }))
        await prisma.matchPlayer.createMany({ data: players, skipDuplicates: true })
    }

    console.log(' - Importing MatchGames...')
    if (data.matchGames.length > 0) {
        const games = data.matchGames.map((item: any) => ({
            ...item,
            start: new Date(item.start),
            end: new Date(item.end),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.matchGame.createMany({ data: games, skipDuplicates: true })
    }

    console.log(' - Importing Bookings...')
    if (data.bookings.length > 0) {
        const bookings = data.bookings.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.booking.createMany({ data: bookings, skipDuplicates: true })
    }

    console.log(' - Importing MatchGameBookings...')
    if (data.matchGameBookings.length > 0) {
        const bookings = data.matchGameBookings.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.matchGameBooking.createMany({ data: bookings, skipDuplicates: true })
    }

    console.log(' - Importing Transactions...')
    if (data.transactions.length > 0) {
        const txs = data.transactions.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
        }))
        await prisma.transaction.createMany({ data: txs, skipDuplicates: true })
    }

    // Import additional tables if they exist
    console.log(' - Importing ClubSchedules...')
    if (data.clubSchedules && data.clubSchedules.length > 0) {
        const schedules = data.clubSchedules.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.clubSchedule.createMany({ data: schedules, skipDuplicates: true })
    }

    console.log(' - Importing InstructorAvailability...')
    if (data.instructorAvailability && data.instructorAvailability.length > 0) {
        const availability = data.instructorAvailability.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.instructorAvailability.createMany({ data: availability, skipDuplicates: true })
    }

    console.log(' - Importing InstructorRestrictions...')
    if (data.instructorRestrictions && data.instructorRestrictions.length > 0) {
        const restrictions = data.instructorRestrictions.map((item: any) => ({
            ...item,
            date: new Date(item.date),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
        }))
        await prisma.instructorRestriction.createMany({ data: restrictions, skipDuplicates: true })
    }

    console.log(' - Importing ImpersonationLogs...')
    if (data.impersonationLogs && data.impersonationLogs.length > 0) {
        const logs = data.impersonationLogs.map((item: any) => ({
            ...item,
            startedAt: new Date(item.startedAt),
            endedAt: item.endedAt ? new Date(item.endedAt) : null
        }))
        await prisma.impersonationLog.createMany({ data: logs, skipDuplicates: true })
    }

    console.log(' - Importing QRSessions...')
    if (data.qrSessions && data.qrSessions.length > 0) {
        const sessions = data.qrSessions.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            expiresAt: new Date(item.expiresAt)
        }))
        await prisma.qRSession.createMany({ data: sessions, skipDuplicates: true })
    }

    console.log('✅ Import completed successfully!')
}

main()
    .catch(e => {
        console.error('❌ Import failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

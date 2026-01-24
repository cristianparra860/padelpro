
import fs from 'fs'
import path from 'path'

const dataPath = path.join(process.cwd(), 'prisma', 'migration_data.json')
const rawData = fs.readFileSync(dataPath, 'utf-8')
const data = JSON.parse(rawData)

console.log('Checking Instructor -> User integrity...')
const userIds = new Set(data.users.map((u: any) => u.id))
const instructorsWithMissingUser = data.instructors.filter((i: any) => !userIds.has(i.userId))

if (instructorsWithMissingUser.length > 0) {
    console.error(`Found ${instructorsWithMissingUser.length} instructors with missing users:`)
    instructorsWithMissingUser.forEach((i: any) => {
        console.error(` - Instructor ID: ${i.id}, User ID: ${i.userId}, Name: ${i.name}`)
    })
} else {
    console.log('✅ All instructors have valid users.')
}

console.log('Checking Club -> Admin integrity...')
// Club has adminId (optional)
const clubAdminIds = data.clubs.filter((c: any) => c.adminId).map((c: any) => c.adminId)
// Admin table
const adminIds = new Set(data.admins.map((a: any) => a.id))
const missingAdmins = clubAdminIds.filter((id: any) => !adminIds.has(id))

if (missingAdmins.length > 0) {
    console.error(`Found ${missingAdmins.length} clubs with missing admins:`, missingAdmins)
} else {
    console.log('✅ All clubs have valid admins (if assigned).')
}

// User -> Club
console.log('Checking User -> Club integrity...')
const clubIds = new Set(data.clubs.map((c: any) => c.id))
const usersWithMissingClub = data.users.filter((u: any) => !clubIds.has(u.clubId))

if (usersWithMissingClub.length > 0) {
    console.error(`Found ${usersWithMissingClub.length} users with missing clubs.`)
} else {
    console.log('✅ All users have valid clubs.')
}

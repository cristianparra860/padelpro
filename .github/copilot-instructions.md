# PadelPro - AI Coding Agent Instructions

## Project Overview
PadelPro is a padel class booking platform built with Next.js 15, Prisma (SQLite in dev), and Firebase. The core innovation is a **multi-modal race booking system** where users compete to fill classes with 1, 2, 3, or 4 players—first complete group wins the court assignment.

## Critical Architecture Patterns

### 1. Race-Based Booking System
The booking flow in `src/app/api/classes/book/route.ts` implements a sophisticated race system:
- **TimeSlot proposals** start with `courtId = NULL` (unconfirmed)
- Users book with `groupSize` (1-4 players) creating competing options
- When any option completes (e.g., 2 bookings of groupSize=2), that group wins:
  - Court gets assigned (`courtNumber` set)
  - Losing bookings get **cancelled with credit refunds**
  - `CourtSchedule` and `InstructorSchedule` marked occupied
  - Overlapping proposals (same time ±30min) get deleted
- **Never** suggest removing the race logic or simplifying to single booking modes

### 2. Database Queries: Raw SQL Over ORM
Due to SQLite timestamp handling and performance, **always use raw SQL queries**:
```typescript
// ✅ CORRECT - Raw SQL for filtering
const slots = await prisma.$queryRawUnsafe(`
  SELECT * FROM TimeSlot 
  WHERE clubId = ? AND start >= ? AND start <= ?
  AND courtId IS NULL
`, clubId, startTimestamp, endTimestamp);

// ❌ AVOID - Prisma ORM often fails with timestamp filters
const slots = await prisma.timeSlot.findMany({ ... });
```

**Key patterns**:
- Use `$queryRawUnsafe` for complex queries with dynamic parameters
- Timestamps stored as integers (milliseconds since epoch)
- Always filter `courtId IS NULL` to show only available classes
- Join bookings/instructors in single queries to avoid N+1 (see `src/app/api/timeslots/route.ts`)

### 3. Prisma Singleton Pattern
**Always** import from `@/lib/prisma.ts`, never instantiate `PrismaClient` directly:
```typescript
// ✅ CORRECT
import { prisma } from '@/lib/prisma';

// ❌ NEVER DO THIS
const prisma = new PrismaClient();
await prisma.$disconnect(); // Causes connection pool exhaustion
```
This singleton prevents the 300+ query N+1 problem documented in `OPTIMIZATION-SUMMARY.md`.

### 4. Auto-Generation & Scheduling
- **Class proposals** auto-generate via `src/app/api/cron/generate-cards/route.ts`
- Configured in `vercel.json` to run daily at 00:00 UTC
- Checks `CourtSchedule` and `InstructorSchedule` for availability before creating slots
- Generates 30-minute intervals (09:00, 09:30, etc.) for 7 days ahead
- **Level-based class generation**: Creates **multiple TimeSlots per horario** (one for each instructor's configured level range)
- Instructors configure level ranges in their preferences panel (e.g., 0-1, 1.5-2.5, 3-4.5, 5-7)
- **Do not** suggest manual class creation—the system is automated

### 5. Level Range Classification System
- Each instructor configures custom level ranges in `Instructor.levelRanges` (JSON field)
- When generating classes, system creates **one TimeSlot per level range** (e.g., 4 classes per time slot if instructor has 4 ranges)
- `TimeSlot.levelRange` stores the assigned range (e.g., "5-7")
- Users automatically see only classes matching their level via `/api/timeslots` filtering
- See `SISTEMA-RANGOS-NIVEL-INSTRUCTOR.md` for complete documentation

## Developer Workflows

### Local Development
```powershell
# Start dev server (runs on port 9002)
npm run dev

# Database operations
npm run db:migrate      # Apply schema changes
npm run db:generate     # Regenerate Prisma client
npm run db:seed:classes # Seed test data

# AI features (optional)
npm run genkit:dev      # Start Genkit for AI recommendations
```

### Testing Booking Flow
Use the many `test-*.js` scripts in root to verify behavior:
```powershell
node test-booking-flow.js          # End-to-end booking test
node test-real-blocking-api.js     # Race system verification
node test-auto-generator.js        # Class generation checks
```

### Debugging Database Issues
The project has 100+ utility scripts (e.g., `check-bookings-db.js`, `verify-slots.js`) for quick DB inspection. When users report data issues, run these before modifying code.

## Project-Specific Conventions

### File Naming
- API routes: `route.ts` (Next.js 15 convention)
- Database scripts: `check-*.js`, `test-*.js`, `create-*.js` (plain Node.js)
- Components: PascalCase (e.g., `ClassCardReal.tsx`, `ClassesDisplay.tsx`)

### Component Patterns
- **Class filtering** in `src/components/class/ClassesDisplay.tsx` uses tab-based UI with `activePlayerFilters` state
- **Booking cards** in `src/components/class/ClassCardReal.tsx` dynamically show 1-4 player options filtered by `allowedPlayerCounts` prop
- Admin panel at `src/app/admin/database/page.tsx` uses flat structure for legacy compatibility (see line 314+)

### State Management
- No global state library—React useState/useEffect + server-side queries
- Forms use `react-hook-form` with `zod` validation
- API calls via `fetch` from `/api/*` routes (Next.js server actions)

### Gender & Level Categories
- `genderCategory`: "masculino" | "femenino" | "mixto" (set on first booking)
- `level`: "principiante" | "intermedio" | "avanzado" | "abierto"
- Filtering UI documented in `SISTEMA-FILTRADO-JUGADORES.md`

## Common Pitfalls

1. **Never delete `groupSize` column** from Booking—it's essential for race logic
2. **Don't assign courts manually**—let the race system handle it in `book/route.ts`
3. **Avoid BigInt serialization errors**—convert with `Number()` before JSON responses
4. **Check `courtId IS NULL`** in queries or you'll show completed classes twice
5. **Update both schedules**—when assigning courts, mark both `CourtSchedule` AND `InstructorSchedule`

## Key Files Reference
- `prisma/schema.prisma` - 13 models including CourtSchedule/InstructorSchedule
- `src/lib/prisma.ts` - Singleton instance (prevents connection exhaustion)
- `src/app/api/classes/book/route.ts` - 400+ line race system implementation
- `src/app/api/timeslots/route.ts` - Optimized N+1 query pattern (3 queries vs 300+)
- `docs/blueprint.md` - Original design spec (user roles, features, AI recommendations)
- `OPTIMIZATION-SUMMARY.md` - Performance improvements (10-15x faster after fixes)

## Integration Points
- **Firebase**: Authentication (configured in `firebase.json`, `apphosting.yaml`)
- **Genkit AI**: Class recommendations flow (`src/ai/` - optional feature)
- **Vercel Cron**: Daily class generation (`vercel.json` → `/api/cron/generate-cards`)
- **Radix UI**: Component library for dialogs, dropdowns, tabs, etc.

## When Making Changes
1. **Run existing tests** first: `node test-*.js` scripts verify expected behavior
2. **Check for markdown docs**: `SISTEMA-*.md`, `IMPLEMENTATION-*.md` explain complex features
3. **Preserve race logic**: Any booking change must maintain the competitive group system
4. **Use raw SQL for filters**: Prisma ORM struggles with SQLite timestamps
5. **Update schedules together**: Court assignment requires updating both Court and Instructor calendars

## Deployment Notes
- Uses SQLite in dev (`prisma/dev.db`), migrate to PostgreSQL for production (see `DEPLOYMENT_GUIDE.md`)
- Port 9002 hardcoded in `package.json` dev script
- Environment: `DATABASE_URL` in `.env` (never commit this file)
- Build command includes `prisma generate` in postinstall hook

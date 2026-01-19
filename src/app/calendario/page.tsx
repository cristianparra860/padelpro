import ClubCalendarImproved from '@/components/admin/ClubCalendarImproved';

export const dynamic = 'force-dynamic';

export default function CalendarioPage() {
  // Usar el club demo "club-1" por defecto
  return <ClubCalendarImproved clubId="club-1" viewMode="club" />;
}

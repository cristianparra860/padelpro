'use client';

import React from 'react';
import ClubCalendar from '@/components/admin/ClubCalendar';

export default function CalendarPage() {
  // Por ahora usar un clubId fijo, luego obtenerlo del contexto del usuario
  const clubId = 'club-1';

  return (
    <div className="container mx-auto py-6">
      <ClubCalendar clubId={clubId} />
    </div>
  );
}

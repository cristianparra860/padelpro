'use client';

import React from 'react';
import ClubCalendar from '@/components/admin/ClubCalendar';

export default function CalendarPage() {
  // Por ahora usar un clubId fijo, luego obtenerlo del contexto del usuario
  const clubId = 'padel-estrella-madrid';

  return (
    <div className="mx-auto py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 max-w-[1600px]">
      {/* Encabezado oculto en móvil */}
      <ClubCalendar clubId={clubId} />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import ClubCalendar from '@/components/admin/ClubCalendar';

export default function CalendarPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const clubId = 'padel-estrella-madrid';

  useEffect(() => {
    const loadUser = async () => {
      console.log('🔄 CalendarPage: Cargando usuario con JWT...');
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('📡 CalendarPage: Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('📦 CalendarPage: Data recibida:', data);
          const userData = data.user || data;
          console.log('✅ CalendarPage: Usuario cargado:', userData.name, userData.id);
          setCurrentUser(userData);
        } else {
          console.log('❌ CalendarPage: Error en respuesta', response.status);
        }
      } catch (error) {
        console.error('❌ CalendarPage: Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  return (
    <div className="mx-auto py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 max-w-[1600px]">
      <ClubCalendar clubId={clubId} currentUser={currentUser} viewMode="club" />
    </div>
  );
}

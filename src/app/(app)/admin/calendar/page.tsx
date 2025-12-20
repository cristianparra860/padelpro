'use client';

import React, { useState, useEffect } from 'react';
import ClubCalendar from '@/components/admin/ClubCalendar2';

export default function CalendarPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const clubId = 'padel-estrella-madrid';

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const userResponse = await fetch('/api/users/current', { headers });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('📊 CalendarPage - Usuario cargado:', userData);
          setCurrentUser(userData);
        } else {
          console.warn('⚠️ CalendarPage - No se pudo cargar el usuario');
        }
      } catch (error) {
        console.error('❌ CalendarPage - Error cargando usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 -ml-8 md:-ml-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando calendario del club...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 md:py-6 px-2 md:px-6 pb-20 md:pb-6 -ml-8 md:-ml-12">
      <ClubCalendar clubId={clubId} currentUser={currentUser} viewMode="club" />
    </div>
  );
}

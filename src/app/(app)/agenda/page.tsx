// src/app/(app)/agenda/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserBookings from '@/components/user/UserBookings';
import type { User } from '@/types';

export default function AgendaPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 Cargando usuario actual para agenda...');
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          console.log('👤 Usuario cargado:', userData?.email);
          setCurrentUser(userData);
        } else {
          console.warn('⚠️ No hay usuario autenticado, redirigiendo...');
          // Si no hay usuario autenticado, redirigir al login
          router.push('/');
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="pl-24 md:pl-32 lg:pl-40 pr-6 py-8 w-full max-w-[1150px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mis Reservas</h1>
        <p className="text-gray-600 mt-2">Gestiona todas tus reservas de clases</p>
      </div>

      <UserBookings currentUser={currentUser} />
    </div>
  );
}

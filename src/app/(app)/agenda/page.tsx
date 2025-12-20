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
        const response = await fetch('/api/users/current');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        } else {
          // Si no hay usuario autenticado, redirigir al login
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/auth/login');
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
    <div className="container mx-auto px-4 py-6 max-w-7xl pl-20 sm:pl-20 md:pl-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mis Reservas</h1>
        <p className="text-gray-600 mt-2">Gestiona todas tus reservas de clases</p>
      </div>
      
      <UserBookings currentUser={currentUser} />
    </div>
  );
}

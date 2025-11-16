"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminBookingCard from '@/components/admin/AdminBookingCard';
import { Loader2 } from 'lucide-react';
import type { User } from '@/types';

interface UserBookingsProps {
  currentUser: User;
  onBookingActionSuccess?: () => void;
}

interface BookingWithTimeSlot {
  id: string;
  userId: string;
  groupSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    profilePictureUrl?: string;
  };
  timeSlot: {
    id: string;
    start: string;
    end: string;
    level: string;
    category: string;
    totalPrice: number;
    maxPlayers: number;
    totalPlayers: number;
    instructor: {
      name: string;
      profilePictureUrl?: string;
    };
    court: {
      number: number;
    } | null;
  };
}

const UserBookings: React.FC<UserBookingsProps> = ({ currentUser, onBookingActionSuccess }) => {
  const [bookings, setBookings] = useState<BookingWithTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'pending' | 'past'>('pending');

  // Cargar reservas del usuario
  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
        console.log(`📚 Cargadas ${data.length} reservas del usuario`);
      } else {
        console.error('Error al cargar reservas:', response.statusText);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadBookings();
    }
  }, [currentUser?.id]);

  // Filtrar reservas por estado
  const getFilteredBookings = () => {
    const now = new Date();
    
    switch (activeFilter) {
      case 'confirmed':
        // Confirmadas: tienen pista asignada (courtId no es null) Y son futuras
        return bookings.filter(b => 
          b.timeSlot.court !== null && 
          b.status !== 'CANCELLED' && 
          new Date(b.timeSlot.start) >= now
        );
      
      case 'pending':
        // Pendientes: NO tienen pista asignada (courtId es null) Y son futuras Y NO canceladas
        return bookings.filter(b => 
          b.timeSlot.court === null && 
          b.status !== 'CANCELLED' && 
          new Date(b.timeSlot.start) >= now
        );
      
      case 'past':
        // Pasadas: clases que ya pasaron O fueron canceladas
        return bookings.filter(b => 
          new Date(b.timeSlot.start) < now || b.status === 'CANCELLED'
        );
      
      case 'all':
      default:
        return bookings;
    }
  };

  // Contar reservas por categoría
  const getBookingCounts = () => {
    const now = new Date();
    return {
      all: bookings.length,
      confirmed: bookings.filter(b => 
        b.timeSlot.court !== null && 
        b.status !== 'CANCELLED' && 
        new Date(b.timeSlot.start) >= now
      ).length,
      pending: bookings.filter(b => 
        b.timeSlot.court === null && 
        b.status !== 'CANCELLED' && 
        new Date(b.timeSlot.start) >= now
      ).length,
      past: bookings.filter(b => 
        new Date(b.timeSlot.start) < now || b.status === 'CANCELLED'
      ).length,
    };
  };

  const filteredBookings = getFilteredBookings();
  const counts = getBookingCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Mis Reservas de Clases
        </CardTitle>
        <CardDescription>
          Gestiona tus reservas: confirmadas, pendientes y pasadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs de filtrado */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1 sm:p-1.5 bg-slate-100 gap-1">
            <TabsTrigger 
              value="pending" 
              className="text-xs sm:text-base lg:text-lg font-semibold py-2 px-1 sm:py-3 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap">⏳ Pend.</span>
              <span className="hidden sm:inline">ientes</span>
              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs sm:text-sm font-bold">
                {counts.pending}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="confirmed" 
              className="text-xs sm:text-base lg:text-lg font-semibold py-2 px-1 sm:py-3 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap">✅ Conf.</span>
              <span className="hidden sm:inline">irmadas</span>
              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-bold">
                {counts.confirmed}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="text-xs sm:text-base lg:text-lg font-semibold py-2 px-1 sm:py-3 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-700 data-[state=active]:shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap">📜 Pas.</span>
              <span className="hidden sm:inline">adas</span>
              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-bold">
                {counts.past}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="text-xs sm:text-base lg:text-lg font-semibold py-2 px-1 sm:py-3 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap">📋 Todas</span>
              <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-bold">
                {counts.all}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Contenido de tabs */}
          <TabsContent value={activeFilter} className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando reservas...</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {activeFilter === 'confirmed' && '✅'}
                  {activeFilter === 'pending' && '⏳'}
                  {activeFilter === 'past' && '📜'}
                  {activeFilter === 'all' && '📋'}
                </div>
                <p className="text-xl text-gray-600 mb-2">
                  {activeFilter === 'confirmed' && 'No tienes reservas confirmadas'}
                  {activeFilter === 'pending' && 'No tienes reservas pendientes'}
                  {activeFilter === 'past' && 'No tienes clases pasadas'}
                  {activeFilter === 'all' && 'No tienes reservas'}
                </p>
                <p className="text-sm text-gray-500">
                  {activeFilter !== 'all' && 'Inscríbete en una clase para verla aquí'}
                  {activeFilter === 'all' && 'Ve a "Clases" para inscribirte en tu primera clase'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.map((booking) => (
                  <AdminBookingCard 
                    key={booking.id} 
                    booking={booking}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Leyenda informativa */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span className="text-lg">ℹ️</span>
            Información sobre tus reservas
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>⏳ Pendientes:</strong> Inscripciones sin pista asignada, esperando que se complete el grupo</li>
            <li><strong>✅ Confirmadas:</strong> Clases con pista asignada y grupo completo, listas para jugar</li>
            <li><strong>📜 Pasadas:</strong> Clases finalizadas o canceladas</li>
            <li><strong>💡 Tip:</strong> Una inscripción pasa a "Confirmada" cuando se completa el grupo y se asigna pista</li>
            <li><strong>❌ Cancelar:</strong> Puedes cancelar cualquier reserva desde el botón en cada tarjeta</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// ✅ PERFORMANCE: Memoizar para evitar re-renders innecesarios
export default React.memo(UserBookings, (prevProps, nextProps) => {
  return prevProps.currentUser?.id === nextProps.currentUser?.id;
});

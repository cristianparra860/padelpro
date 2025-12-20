"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingCard from './BookingCard';
import { Loader2 } from 'lucide-react';
import type { User, TimeSlot } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
      id: string;
      name: string;
      profilePictureUrl?: string;
    };
    instructorId: string;
    instructorName: string;
    instructorProfilePicture?: string;
    court: {
      number: number;
    } | null;
    courtId?: string | null;
    courtNumber?: number | null;
    genderCategory: string | null;
    creditsSlots?: number[];
    bookings?: any[];
  };
}

const UserBookings: React.FC<UserBookingsProps> = ({ currentUser, onBookingActionSuccess }) => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'confirmed' | 'pending' | 'past' | 'cancelled' | null;
  
  const [bookings, setBookings] = useState<BookingWithTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'confirmed' | 'pending' | 'past' | 'cancelled'>(tabParam || 'pending');
  const { toast } = useToast();

  // Actualizar pestaña si cambia el parámetro URL
  useEffect(() => {
    if (tabParam && ['confirmed', 'pending', 'past', 'cancelled'].includes(tabParam)) {
      setActiveFilter(tabParam);
    }
  }, [tabParam]);

  // Callback memoizado para onBookingSuccess
  const handleBookingSuccess = useCallback(() => {
    loadBookings();
    if (onBookingActionSuccess) {
      onBookingActionSuccess();
    }
  }, [onBookingActionSuccess]); // loadBookings es estable por useCallback

  // Cargar reservas del usuario - Memoizada con useCallback
  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) {
      console.warn('⚠️ No se puede cargar bookings: currentUser.id no existe');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📚 Cargando bookings para usuario:', currentUser.id);
      const response = await fetch(`/api/users/${currentUser.id}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
        console.log(`✅ Cargadas ${data.length} reservas del usuario`);
      } else {
        console.error('❌ Error al cargar reservas:', response.statusText);
        setBookings([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar reservas:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Función para cancelar booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const url = `/api/admin/bookings/${bookingId}`;
      console.log('📞 Cancelando booking:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "¡Reserva cancelada!",
          description: "Tu reserva ha sido cancelada exitosamente",
          className: "bg-orange-600 text-white"
        });
        
        // Recargar bookings
        await loadBookings();
        
        // Notificar al padre para que actualice el calendario
        if (onBookingActionSuccess) {
          onBookingActionSuccess();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error al cancelar",
          description: errorData.error || 'No se pudo cancelar la reserva',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast({
        title: "Error de conexión",
        description: 'No se pudo conectar con el servidor',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      console.log('🔄 useEffect triggered - Loading bookings for:', currentUser.id);
      
      // Timeout de seguridad: si loadBookings tarda más de 10 segundos, mostrar error
      const timeoutId = setTimeout(() => {
        console.error('⏰ TIMEOUT: loadBookings tardó más de 10 segundos');
        setIsLoading(false);
      }, 10000);
      
      loadBookings().finally(() => {
        clearTimeout(timeoutId);
      });
      
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.warn('⚠️ useEffect: currentUser.id no existe');
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Memoizar filtrado para evitar recalcular en cada render
  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    switch (activeFilter) {
      case 'confirmed':
        return bookings.filter(b => {
          const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return hasCourtAssigned && isFuture && isNotCancelled;
        });
      
      case 'pending':
        return bookings.filter(b => {
          const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return noCourtAssigned && isFuture && isNotCancelled;
        });
      
      case 'past':
        return bookings.filter(b => {
          const isPast = new Date(b.timeSlot.start) < now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        });
      
      case 'cancelled':
        return bookings.filter(b => {
          const isCancelled = b.status === 'CANCELLED';
          const wasConfirmed = (b as any).wasConfirmed === true; // Solo las que fueron confirmadas
          return isCancelled && wasConfirmed;
        });
      
      default:
        return bookings;
    }
  }, [bookings, activeFilter]);

  // Memoizar contadores para evitar recalcular en cada render
  const counts = useMemo(() => {
    const now = new Date();
    return {
      confirmed: bookings.filter(b => {
        const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return hasCourtAssigned && isFuture && isNotCancelled;
      }).length,
      pending: bookings.filter(b => {
        const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isFuture && isNotCancelled;
      }).length,
      past: bookings.filter(b => {
        const isPast = new Date(b.timeSlot.start) < now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return isPast && isNotCancelled;
      }).length,
      cancelled: bookings.filter(b => {
        const isCancelled = b.status === 'CANCELLED';
        const wasConfirmed = (b as any).wasConfirmed === true;
        return isCancelled && wasConfirmed;
      }).length,
    };
  }, [bookings]);

  return (
    <Card className="shadow-lg border-gray-200 relative z-0 max-w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-gray-800">
          <span className="text-3xl">📋</span>
          Mis Reservas de Clases
        </CardTitle>
        <CardDescription className="text-base text-gray-600 mt-2">
          Gestiona tus reservas: con pista asignada, pendientes y pasadas
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Tabs de filtrado */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full max-w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1.5 sm:p-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl gap-2 shadow-inner">
            {/* Inscripciones - Azul como botón I */}
            <TabsTrigger 
              value="pending" 
              style={{
                backgroundColor: activeFilter === 'pending' ? '#3b82f6' : undefined,
                color: activeFilter === 'pending' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'pending' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">⏳</span>
                <span className="whitespace-nowrap">Inscr.</span>
              </span>
              <span className="hidden sm:inline">ipciones</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'pending' ? 'white' : undefined,
                  color: activeFilter === 'pending' ? '#3b82f6' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'pending'
                    ? ''
                    : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                }`}>
                {counts.pending}
              </span>
            </TabsTrigger>
            
            {/* Reservas - Rojo como botón R */}
            <TabsTrigger 
              value="confirmed" 
              style={{
                backgroundColor: activeFilter === 'confirmed' ? '#ef4444' : undefined,
                color: activeFilter === 'confirmed' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'confirmed' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">✅</span>
                <span className="whitespace-nowrap">Reservas</span>
              </span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'confirmed' ? 'white' : undefined,
                  color: activeFilter === 'confirmed' ? '#ef4444' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'confirmed'
                    ? ''
                    : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                }`}>
                {counts.confirmed}
              </span>
            </TabsTrigger>
            
            {/* Pasadas - Gris y Blanca */}
            <TabsTrigger 
              value="past" 
              style={{
                backgroundColor: activeFilter === 'past' ? '#6b7280' : undefined,
                color: activeFilter === 'past' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'past' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">📜</span>
                <span className="whitespace-nowrap">Pas.</span>
              </span>
              <span className="hidden sm:inline">adas</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'past' ? 'white' : undefined,
                  color: activeFilter === 'past' ? '#6b7280' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'past'
                    ? ''
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}>
                {counts.past}
              </span>
            </TabsTrigger>
            
            {/* Canceladas - Naranja y Blanca */}
            <TabsTrigger 
              value="cancelled" 
              style={{
                backgroundColor: activeFilter === 'cancelled' ? '#f97316' : undefined,
                color: activeFilter === 'cancelled' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'cancelled' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">❌</span>
                <span className="whitespace-nowrap">Canc.</span>
              </span>
              <span className="hidden sm:inline">eladas</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'cancelled' ? 'white' : undefined,
                  color: activeFilter === 'cancelled' ? '#f97316' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'cancelled'
                    ? ''
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                }`}>
                {counts.cancelled}
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
                  {activeFilter === 'cancelled' && '❌'}
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-gray-700">
                  {activeFilter === 'confirmed' && 'No tienes reservas con pista asignada'}
                  {activeFilter === 'pending' && 'No tienes inscripciones pendientes'}
                  {activeFilter === 'past' && 'No tienes clases pasadas'}
                  {activeFilter === 'cancelled' && 'No tienes clases canceladas'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {activeFilter === 'cancelled' ? 'Las clases canceladas aparecerán aquí' : 'Inscríbete en una clase para verla aquí'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    currentUser={currentUser}
                    onBookingSuccess={handleBookingSuccess}
                    onCancelBooking={handleCancelBooking}
                    isPastClass={activeFilter === 'past'}
                    isCancelled={booking.status === 'CANCELLED'}
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
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">R</span>
              <strong>Reservas:</strong> Clases con pista asignada y grupo completo, listas para jugar
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">I</span>
              <strong>Inscripciones:</strong> Inscripciones sin pista asignada, esperando que se complete el grupo
            </li>
            <li><strong>📜 Pasadas:</strong> Clases finalizadas</li>
            <li><strong>❌ Canceladas:</strong> Clases que han sido canceladas</li>
            <li><strong>💡 Tip:</strong> Una inscripción pasa a "Confirmada" cuando se completa el grupo y se asigna pista</li>
            <li><strong>🚫 Límite:</strong> Solo puedes tener una reserva confirmada por día. Otras inscripciones del mismo día se cancelan automáticamente</li>
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

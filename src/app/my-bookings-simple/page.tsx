'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, MapPin, Euro, Calendar, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { safeParseDate, validateDateProperties } from '@/lib/dateUtils';

// Cargar ClassCardReal dinámicamente para evitar problemas de hidratación
const ClassCardReal = dynamic(() => import('@/components/class/ClassCardReal'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
});

// Importar los tipos necesarios
import type { TimeSlot, User as UserType } from '@/types';

interface BookingTimeSlot extends TimeSlot {
  uniqueKey?: string;
  originalTimeSlotId?: string;
  userBooking?: {
    id: string;
    userId: string;
    groupSize: number;
    status: string;
    createdAt: string;
    isCompleted: boolean;
    isPast: boolean;
  };
}

export default function MyBookingsSimple() {
  const [bookings, setBookings] = useState<BookingTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [clientReady, setClientReady] = useState(false);

  // Control de montaje para evitar actualizaciones en componente desmontado
  useEffect(() => {
    setMounted(true);
    setClientReady(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (mounted && clientReady) {
      fetchBookings();
    }
  }, [mounted, clientReady]);

  // Memoizar la lista de bookings procesados para evitar re-renders innecesarios
  const processedBookings = useMemo(() => {
    return bookings
      // Filtrar bookings válidos para evitar errores de renderizado
      .filter(booking => booking && booking.id && booking.startTime && booking.endTime)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings]);

  const fetchBookings = async () => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching bookings...');
      
      // 🔧 TEMPORAL: Usar usuario real de la base de datos (Carlos López)
      const forceUserId = 'cmfm2r0ou0003tg2cyyyoxil5';
      console.log('🔧 FORZANDO USER ID para mis reservas:', forceUserId);
      
      const response = await fetch(`/api/my/bookings?userId=${forceUserId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📥 API response:', data);
      
      // Manejar tanto arrays directos como objetos con propiedad value
      const bookingsArray = Array.isArray(data) ? data : (data.value || []);
      console.log('📋 Bookings count:', bookingsArray.length);
      console.log('📋 Sample booking data:', bookingsArray[0]); // Debug: ver estructura de datos
      
      // Convertir strings de fecha a objetos Date para compatibilidad con ClassCardReal
      const processedBookings = bookingsArray.map((booking: any) => {
        const processedBooking = {
          ...booking,
          startTime: safeParseDate(booking.startTime),
          endTime: safeParseDate(booking.endTime),
          // Convertir también fechas anidadas si existen
          userBooking: booking.userBooking ? {
            ...booking.userBooking,
            createdAt: safeParseDate(booking.userBooking.createdAt)
          } : undefined
        };
        
        // Validar que las fechas se convirtieron correctamente
        const isValid = validateDateProperties(processedBooking, ['startTime', 'endTime']);
        console.log('🔍 Processed booking:', {
          id: processedBooking.id,
          uniqueKey: processedBooking.uniqueKey,
          isValid,
          startTime: processedBooking.startTime,
          endTime: processedBooking.endTime
        });
        
        return processedBooking;
      });
      
      // Solo actualizar si el componente sigue montado
      if (mounted) {
        setBookings(processedBookings);
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      if (mounted) {
        setBookings([]);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (!mounted) return;
    setRefreshing(true);
    await fetchBookings();
    if (mounted) {
      setRefreshing(false);
    }
  };

  const handleCancelBooking = async (bookingId?: string, timeSlotId?: string) => {
    if (!mounted || cancelling || typeof window === 'undefined' || !bookingId) return;
    
    // Confirmación antes de cancelar
    const confirmCancel = window.confirm(
      '¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer.'
    );
    
    if (!confirmCancel) return;

    try {
      setCancelling(bookingId);
      
      const response = await fetch('/api/classes/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: bookingId,
          userId: 'cmfm2r0ou0003tg2cyyyoxil5', // 🔧 Usar usuario real consistente con el resto
          timeSlotId: timeSlotId,
        })
      });

      if (response.ok && mounted) {
        console.log('✅ Reserva cancelada exitosamente');
        alert('✅ Reserva cancelada exitosamente');
        
        // Hacer una recarga completa después de un pequeño delay
        setTimeout(async () => {
          if (mounted) {
            await fetchBookings();
          }
        }, 500);
      } else if (mounted) {
        const error = await response.json();
        console.error('❌ Error al cancelar:', error);
        alert('Error al cancelar la reserva: ' + (error.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      if (mounted) {
        alert('Error de conexión al cancelar la reserva');
      }
    } finally {
      if (mounted) {
        setCancelling(null);
      }
    }
  };



  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando tus reservas...</span>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4 space-y-2">
          <p>🔍 Conectando a: /api/my/bookings?userId=cmfm2r0ou0003tg2cyyyoxil5</p>
          <Button 
            onClick={() => {
              console.log('🔄 Manual reload triggered');
              fetchBookings();
            }}
            variant="outline"
            className="mt-4"
          >
            🔄 Forzar recarga
          </Button>
        </div>
      </div>
    );
  }

  // Prevenir render hasta que el cliente esté listo
  if (!clientReady) {
    return <div className="p-6 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Reservas</h1>
          <p className="text-gray-600 mt-1">
            Aquí puedes ver todas tus clases reservadas
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug Information</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>API Endpoint:</strong> /api/my/bookings?userId=cmfm2r0ou0003tg2cyyyoxil5</p>
          <p><strong>Component mounted:</strong> {mounted ? 'Yes' : 'No'}</p>
          <p><strong>Loading state:</strong> {loading ? 'Loading...' : 'Loaded'}</p>
          <p><strong>Total bookings loaded:</strong> {bookings.length}</p>
          {bookings.length > 0 && (
            <p><strong>First booking ID:</strong> {bookings[0]?.id}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Reservas</p>
                <p className="text-2xl font-bold text-gray-900">{processedBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Próximas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {processedBookings.filter(b => new Date(b.startTime) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {processedBookings.reduce((sum, booking) => {
                    const pricePerPerson = (booking.totalPrice || 0) / booking.maxPlayers;
                    const groupSize = booking.userBooking?.groupSize || 1;
                    return sum + (pricePerPerson * groupSize);
                  }, 0).toFixed(2)}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      {processedBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes reservas confirmadas
            </h3>
            <p className="text-gray-600 mb-4">
              Las reservas aparecen aquí cuando las clases se completan y confirman.
              <br />
              <span className="text-sm">Mientras tanto, tus inscripciones están siendo procesadas.</span>
            </p>
            <Button asChild>
              <a href="/activities?view=clases">
                Explorar Clases
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Tus Clases Confirmadas</h4>
            <p className="text-sm text-blue-700">
              Estas son las clases que ya se completaron con suficientes jugadores o que ya tuvieron lugar.
              Solo aparecen aquí las reservas finales confirmadas.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedBookings.map((booking) => {
                // Validar que tenemos los datos necesarios antes de renderizar
                if (!booking.startTime || !booking.endTime) {
                  console.warn('❌ Missing date data for booking:', booking.id);
                  return null;
                }
                
                // Validar que las fechas son objetos Date válidos
                if (!(booking.startTime instanceof Date) || !(booking.endTime instanceof Date)) {
                  console.error('❌ Invalid date objects for booking:', booking.id, {
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    startTimeType: typeof booking.startTime,
                    endTimeType: typeof booking.endTime
                  });
                  return null;
                }

                // Validar que los métodos Date están disponibles
                if (typeof booking.startTime.getHours !== 'function' || 
                    typeof booking.endTime.getHours !== 'function') {
                  console.error('❌ Date methods not available for booking:', booking.id);
                  return null;
                }
                
                // Debug final antes de renderizar ClassCardReal
                console.log('🎯 About to render ClassCardReal with valid dates:', {
                  id: booking.id,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  canCallGetHours: typeof booking.startTime.getHours === 'function'
                });
                
                return (
                  <div key={booking.uniqueKey || booking.id} className="flex justify-center">
                    <ClassCardReal
                      classData={booking}
                      currentUser={{ id: 'cmfm2r0ou0003tg2cyyyoxil5', name: 'Carlos López' } as UserType}
                      onBookingSuccess={fetchBookings}
                      showPointsBonus={false}
                    />
                  </div>
                );
              })
              // Filtrar elementos null
              .filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}

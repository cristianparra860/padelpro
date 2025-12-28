'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, MapPin, Trophy, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MatchGameCard from '@/components/match/MatchGameCard';
import DateSelector from '@/components/admin/DateSelector';
import type { User as UserType } from '@/types';

interface MatchGameBooking {
  id: string;
  userId: string;
  status: string;
  user: {
    id: string;
    name: string;
    level: string;
    gender?: string;
    profilePictureUrl?: string;
  };
}

interface MatchGame {
  id: string;
  clubId: string;
  courtNumber?: number;
  start: string;
  end: string;
  duration: number;
  maxPlayers: number;
  pricePerPlayer: number;
  level?: string;
  genderCategory?: string;
  isOpen: boolean;
  bookings: MatchGameBooking[];
}

type TimeSlotFilter = 'all' | 'morning' | 'midday' | 'evening';
type ViewFilter = 'all' | 'withBookings' | 'empty';

export default function MatchGamesPage() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlotFilter>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false);
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false);
  const [userBookings, setUserBookings] = useState<any[]>([]);

  useEffect(() => {
    // Obtener usuario actual
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/users/current', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            console.log('✅ Usuario autenticado:', data.user.name);
            setCurrentUser(data.user);
          } else {
            console.log('⚠️ No hay usuario en la respuesta');
          }
        } else {
          console.log('❌ Error obteniendo usuario:', res.status);
        }
      } catch (error) {
        console.error('❌ Error en fetch de usuario:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Cargar bookings del usuario para el calendario
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchUserBookings = async () => {
      try {
        // Obtener bookings de clases (próximos 30 días)
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        const classBookingsRes = await fetch(`/api/bookings?userId=${currentUser.id}`);
        const classBookingsData = await classBookingsRes.json();
        const classBookings = (classBookingsData.bookings || []).filter((b: any) => {
          const bookingDate = new Date(b.timeSlot?.start || new Date());
          return bookingDate <= thirtyDaysLater;
        });

        // Obtener todas las partidas del club para extraer los bookings del usuario
        const matchGamesRes = await fetch(`/api/matchgames?clubId=club-1`);
        const matchGamesData = await matchGamesRes.json();
        const matchGames = matchGamesData.matchGames || [];
        
        // Filtrar solo los bookings del usuario en partidas
        const matchBookings = matchGames
          .filter((mg: MatchGame) => mg.bookings.some(b => b.userId === currentUser.id))
          .map((mg: MatchGame) => ({
            timeSlotId: mg.id,
            status: 'PENDING', // Las partidas son inscripciones (I azul), no reservas (R rojo)
            date: mg.start
          }));

        // Combinar bookings para el calendario
        const allBookings = [
          ...classBookings.map((b: any) => ({
            timeSlotId: b.timeSlotId,
            status: b.status,
            date: b.timeSlot?.start || new Date()
          })),
          ...matchBookings
        ];

        setUserBookings(allBookings);
      } catch (error) {
        console.error('Error cargando bookings del usuario:', error);
      }
    };

    fetchUserBookings();
  }, [currentUser?.id]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/matchgames?clubId=club-1&date=${dateStr}`);
      const data = await response.json();
      
      if (response.ok) {
        setMatches(data.matchGames || []);
      } else {
        throw new Error(data.error || 'Error al cargar partidas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las partidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedDate]);

  const filteredMatches = matches.filter(match => {
    // Filtro de tab
    if (activeTab === 'available' && match.bookings.length >= match.maxPlayers) return false;
    if (activeTab === 'myMatches' && !match.bookings.some(b => b.userId === currentUser?.id)) return false;
    
    // Filtro de horario
    if (timeSlotFilter !== 'all') {
      const hour = new Date(match.start).getHours();
      if (timeSlotFilter === 'morning' && (hour < 6 || hour >= 12)) return false;
      if (timeSlotFilter === 'midday' && (hour < 12 || hour >= 18)) return false;
      if (timeSlotFilter === 'evening' && (hour < 18 || hour >= 24)) return false;
    }
    
    // Filtro de tipo de vista
    if (viewFilter === 'withBookings' && match.bookings.length === 0) return false;
    if (viewFilter === 'empty' && match.bookings.length > 0) return false;
    
    return true;
  });

  return (
    <div className="relative">
      {/* Barra lateral de filtros */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 md:gap-3 items-center pr-1">
        {/* Título "Filtros" */}
        <div className="bg-white rounded-full px-2 py-1 md:px-3 md:py-1.5 shadow-md border border-gray-200">
          <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-gray-600">
            Filtros
          </span>
        </div>

        {/* 🕐 Filtro de horario */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Horario
          </span>
          <button
            type="button"
            onClick={() => setShowTimeFilterPanel(true)}
            className={`
              w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${timeSlotFilter !== 'all'
                ? 'bg-white border border-purple-500 shadow-[inset_0_1px_3px_rgba(168,85,247,0.2)]'
                : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
              }
            `}
            title="Filtrar por horario"
          >
            <Clock className={`w-5 h-5 md:w-7 md:h-7 ${timeSlotFilter !== 'all' ? 'text-purple-600' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* 👥 Filtro de tipo de vista */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Vista
          </span>
          <button
            type="button"
            onClick={() => setShowViewFilterPanel(true)}
            className={`
              w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${viewFilter !== 'all'
                ? 'bg-white border border-purple-500 shadow-[inset_0_1px_3px_rgba(168,85,247,0.2)]'
                : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
              }
            `}
            title="Filtrar por tipo de vista"
          >
            <Users className={`w-5 h-5 md:w-7 md:h-7 ${viewFilter !== 'all' ? 'text-purple-600' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* Panel de filtro de horario */}
      {showTimeFilterPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowTimeFilterPanel(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Filtrar por Horario</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setTimeSlotFilter('all'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  timeSlotFilter === 'all' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                🌍 Todas las horas
              </button>
              <button
                onClick={() => { setTimeSlotFilter('morning'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  timeSlotFilter === 'morning' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                🌅 Mañana (6:00 - 12:00)
              </button>
              <button
                onClick={() => { setTimeSlotFilter('midday'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  timeSlotFilter === 'midday' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                ☀️ Mediodía (12:00 - 18:00)
              </button>
              <button
                onClick={() => { setTimeSlotFilter('evening'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  timeSlotFilter === 'evening' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                🌙 Tarde/Noche (18:00 - 24:00)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de filtro de vista */}
      {showViewFilterPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowViewFilterPanel(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Filtrar por Estado</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setViewFilter('all'); setShowViewFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'all' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                🎾 Todas las partidas
              </button>
              <button
                onClick={() => { setViewFilter('withBookings'); setShowViewFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'withBookings' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                ✅ Con jugadores inscritos
              </button>
              <button
                onClick={() => { setViewFilter('empty'); setShowViewFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'empty' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                ⭕ Vacías (sin jugadores)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <div className="container mx-auto px-4 py-2 max-w-6xl ml-24 mr-64 lg:ml-32 lg:mr-72">
        {/* Calendario Lineal */}
        <div className="mb-2">
          <DateSelector 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            userBookings={userBookings}
            daysToShow={30}
          />
        </div>

        <div className="mb-2">
        {/* Selector de fecha */}
        <div className="flex gap-2 mb-2">
          <Button
            variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setSelectedDate(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd') ? 'default' : 'outline'}
            onClick={() => setSelectedDate(new Date(Date.now() + 86400000))}
          >
            Mañana
          </Button>
        </div>
      </div>

      {/* Lista de partidas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay partidas disponibles</h3>
            <p className="text-gray-600 text-sm">
              {activeTab === 'myMatches' 
                ? 'No estás inscrito en ninguna partida para esta fecha'
                : 'No hay partidas programadas para esta fecha'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-20 pr-48 lg:pr-56 py-0">
          {filteredMatches.map(match => (
            <MatchGameCard
              key={match.id}
              matchGame={match}
              currentUser={currentUser}
              onBookingSuccess={loadMatches}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
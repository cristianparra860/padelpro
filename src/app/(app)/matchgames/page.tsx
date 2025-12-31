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
  courtsAvailability?: Array<{
    courtId: string;
    courtNumber: number;
    status: 'available' | 'occupied';
  }>;
}

type TimeSlotFilter = 'all' | 'morning' | 'midday' | 'evening';
type ViewFilter = 'all' | 'withBookings' | 'empty';

export default function MatchGamesPage() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchGame[]>([]);

  // Estilos personalizados para scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .matchgames-scrollbar::-webkit-scrollbar {
        width: 10px;
      }
      .matchgames-scrollbar::-webkit-scrollbar-track {
        background: #e5e7eb;
        border-radius: 10px;
      }
      .matchgames-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #9ca3af 0%, #6b7280 100%);
        border-radius: 20px;
        border: 2px solid #e5e7eb;
        box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
        background-image: 
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.3) 55%, transparent 60%),
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.3) 55%, transparent 60%),
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.3) 55%, transparent 60%);
        background-size: 100% 8px;
        background-position: 0 25%, 0 50%, 0 75%;
        background-repeat: no-repeat;
      }
      .matchgames-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #6b7280 0%, #4b5563 100%);
        background-image: 
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.4) 55%, transparent 60%),
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.4) 55%, transparent 60%),
          linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.4) 55%, transparent 60%);
        background-size: 100% 8px;
        background-position: 0 25%, 0 50%, 0 75%;
        background-repeat: no-repeat;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlotFilter>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false);
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  
  // 💾 Estado para filtros guardados en BD
  const [savedFilters, setSavedFilters] = useState<{
    timeSlot: string;
    viewType: string;
  } | null>(null);
  const [loadingSavedFilters, setLoadingSavedFilters] = useState(true);


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
  
  // 💾 Cargar filtros guardados del usuario
  useEffect(() => {
    const loadSavedFilters = async () => {
      if (!currentUser) {
        setLoadingSavedFilters(false);
        return;
      }
      
      try {
        const response = await fetch('/api/users/filter-preferences', {
          headers: {
            'x-user-id': currentUser.id
          }
        });
        
        if (response.ok) {
          const filters = await response.json();
          setSavedFilters({
            timeSlot: filters.timeSlot || 'all',
            viewType: filters.viewType || 'all'
          });
          console.log('✅ Filtros de partidas cargados:', filters);
        }
      } catch (error) {
        console.error('❌ Error cargando filtros de partidas:', error);
      } finally {
        setLoadingSavedFilters(false);
      }
    };
    
    loadSavedFilters();
  }, [currentUser]);

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
    // 🕐 FILTRO DE HORARIOS PASADOS: Ocultar partidas cuya hora de inicio ya pasó
    const now = new Date();
    const matchTime = new Date(match.start);
    const isPast = matchTime <= now; // Ocultar si ya llegó o pasó la hora de inicio
    
    if (isPast) {
      return false; // No mostrar partidas pasadas o en curso
    }
    
    // 🏟️ FILTRO DE DISPONIBILIDAD: No mostrar partidas sin pistas disponibles
    const isUserInscribed = match.bookings.some(b => b.userId === currentUser?.id);
    
    // Si el usuario está inscrito, siempre mostrar la partida
    if (!isUserInscribed) {
      // Si el usuario no está inscrito, verificar disponibilidad de pistas
      const hasAvailableCourts = match.courtsAvailability?.some(c => c.status === 'available');
      
      // Si no hay pistas disponibles, no mostrar la partida
      if (!hasAvailableCourts) {
        return false;
      }
    }
    
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
      <div className="fixed left-4 top-[1020px] z-30 flex flex-col gap-1.5 items-start">
        
        {/* Título Filtros */}
        <div className="text-gray-700 font-bold text-sm uppercase tracking-wide mb-1 ml-2">
          Filtros
        </div>
        
        {/* 🕐 Filtro de horario */}
        <button
          type="button"
          onClick={() => setShowTimeFilterPanel(true)}
          className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all flex items-center gap-3 px-4 py-3 min-w-[220px]"
          title="Filtrar por horario"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
            timeSlotFilter !== 'all'
              ? 'bg-gradient-to-br from-purple-400 to-purple-600'
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
          }`}>
            <Clock className="w-8 h-8" />
          </div>
          <div className="text-left flex-1">
            <div className="text-sm font-semibold text-gray-800">
              {timeSlotFilter === 'all' ? 'Todas las horas' :
               timeSlotFilter === 'morning' ? 'Mañana' :
               timeSlotFilter === 'midday' ? 'Mediodía' : 'Tarde/Noche'}
            </div>
            <div className="text-xs text-gray-500">Filtrar por horario</div>
          </div>
        </button>

        {/* 👥 Filtro de tipo de vista */}
        <button
          type="button"
          onClick={() => setShowViewFilterPanel(true)}
          className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all flex items-center gap-3 px-4 py-3 min-w-[220px]"
          title="Filtrar por tipo de vista"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
            viewFilter !== 'all'
              ? 'bg-gradient-to-br from-purple-400 to-purple-600'
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
          }`}>
            <Users className="w-8 h-8" />
          </div>
          <div className="text-left flex-1">
            <div className="text-sm font-semibold text-gray-800">
              {viewFilter === 'all' ? 'Todas' :
               viewFilter === 'withBookings' ? 'Con Jugadores' : 'Vacías'}
            </div>
            <div className="text-xs text-gray-500">Estado de partida</div>
          </div>
        </button>
        
        {/* Botón Guardar/Borrar Filtros */}
        <button
          onClick={async () => {
            if (!currentUser) return;
            
            // Verificar si hay filtros guardados en BD
            const hasFiltersInDB = savedFilters && (
              savedFilters.timeSlot !== 'all' ||
              savedFilters.viewType !== 'all'
            );
            
            if (hasFiltersInDB) {
              // BORRAR filtros guardados
              try {
                const response = await fetch('/api/users/filter-preferences', {
                  method: 'DELETE',
                  headers: {
                    'x-user-id': currentUser.id
                  }
                });
                
                if (response.ok) {
                  // Resetear a valores por defecto
                  setTimeSlotFilter('all');
                  setViewFilter('all');
                  setSavedFilters(null);
                  console.log('✅ Filtros de partidas borrados');
                }
              } catch (error) {
                console.error('❌ Error al borrar filtros de partidas:', error);
              }
            } else {
              // GUARDAR filtros actuales
              try {
                const response = await fetch('/api/users/filter-preferences', {
                  method: 'POST',
                  headers: {
                    'x-user-id': currentUser.id,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    timeSlot: timeSlotFilter,
                    viewType: viewFilter,
                    playerCounts: [],
                    instructorIds: [],
                    type: 'matches'
                  })
                });
                
                if (response.ok) {
                  setSavedFilters({
                    timeSlot: timeSlotFilter,
                    viewType: viewFilter
                  });
                  console.log('✅ Filtros de partidas guardados');
                }
              } catch (error) {
                console.error('❌ Error al guardar filtros de partidas:', error);
              }
            }
          }}
          className={`px-4 py-2 rounded-2xl font-medium text-xs transition-all shadow-md hover:shadow-lg w-full text-center ${
            savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all')
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
              : (timeSlotFilter !== 'all' || viewFilter !== 'all')
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              : 'bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700'
          }`}
        >
          {savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all')
            ? '🗑️ Borrar filtros'
            : (timeSlotFilter !== 'all' || viewFilter !== 'all')
            ? '💾 Guardar búsqueda'
            : '💾 Guardar búsqueda'}
        </button>
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

      {/* Calendario Lineal - Todo el ancho */}
      <div className="mb-2 w-full">
        <DateSelector 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          userBookings={userBookings}
          daysToShow={30}
        />
      </div>

      {/* Contenedor principal para tarjetas */}
      <div className="w-full ml-52 lg:ml-56 mr-4 px-0 py-1 matchgames-scrollbar overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>

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
        <div className="grid grid-cols-3 gap-x-1 gap-y-4 w-full max-w-[calc(100vw-235px)] lg:max-w-[calc(100vw-250px)]">
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
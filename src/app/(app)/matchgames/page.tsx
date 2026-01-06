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
  hasCourtReservation?: boolean;
  courtReservationUser?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  } | null;
  bookings: MatchGameBooking[];
}

type TimeSlotFilter = 'all' | 'morning' | 'midday' | 'evening';
type ViewFilter = 'all' | 'onlyEmpty' | 'onlyAvailable' | 'onlyMyMatches';

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
  
  // 📅 Leer fecha guardada del localStorage
  const getSavedDate = (): Date => {
    try {
      const savedDate = localStorage.getItem('selectedCalendarDate');
      if (savedDate) {
        const parsed = new Date(savedDate);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error reading saved date:', error);
    }
    return new Date();
  };
  
  const [selectedDate, setSelectedDate] = useState(getSavedDate());
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
      console.error('❌ Error cargando matches:', error);
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
    const isPast = matchTime <= now;
    
    if (isPast) return false;
    
    // Verificar si el usuario está inscrito en esta partida
    const isUserInMatch = match.bookings.some(b => b.userId === currentUser?.id);
    const isEmpty = match.bookings.length === 0;
    const isFull = match.bookings.length >= match.maxPlayers;
    const hasSpace = !isEmpty && !isFull; // Tiene entre 1 y maxPlayers-1 jugadores
    
    // Filtro de tab
    if (activeTab === 'available') {
      if (isFull && !isUserInMatch) return false;
    }
    if (activeTab === 'myMatches' && !isUserInMatch) return false;
    
    // Filtro de horario
    if (timeSlotFilter !== 'all') {
      const hour = new Date(match.start).getHours();
      if (timeSlotFilter === 'morning' && (hour < 6 || hour >= 12)) return false;
      if (timeSlotFilter === 'midday' && (hour < 12 || hour >= 18)) return false;
      if (timeSlotFilter === 'evening' && (hour < 18 || hour >= 24)) return false;
    }
    
    // Nuevos filtros de tipo de vista
    if (viewFilter === 'onlyEmpty' && !isEmpty) return false; // Mostrar solo vacías
    if (viewFilter === 'onlyAvailable' && !hasSpace) return false; // Mostrar solo con espacio (1-3 jugadores)
    if (viewFilter === 'onlyMyMatches' && !isUserInMatch) return false; // Mostrar solo mis partidas
    
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

        {/* Espacio extra para bajar los botones dos posiciones */}
        <div style={{ height: '112px' }} />
        {/* 🕐 Filtro de horario */}
        <button
          type="button"
          onClick={() => setShowTimeFilterPanel(true)}
          className={`rounded-3xl border-2 flex items-center gap-3 px-3.5 py-2.5 w-[198px] transition-all
            ${timeSlotFilter !== 'all'
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-purple-500 shadow-lg'
              : 'bg-white text-gray-800 border-gray-300 hover:shadow-xl'}
          `}
          title="Filtrar por horario"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${timeSlotFilter !== 'all' ? 'bg-white border-purple-400 text-purple-600' : 'bg-white border-gray-300 text-gray-400'}`}>
            <Clock className={`w-7 h-7 ${timeSlotFilter !== 'all' ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-left flex-1">
            <div className={`text-sm font-semibold ${timeSlotFilter !== 'all' ? 'text-white' : 'text-gray-800'}`}> 
              {timeSlotFilter === 'all' ? 'Todas las horas' :
               timeSlotFilter === 'morning' ? 'Mañana' :
               timeSlotFilter === 'midday' ? 'Mediodía' : 'Tarde/Noche'}
            </div>
            <div className={`text-xs ${timeSlotFilter !== 'all' ? 'text-purple-100' : 'text-gray-500'}`}>Filtrar por horario</div>
          </div>
        </button>

        {/* 👥 Filtro de tipo de vista */}
        <button
          type="button"
          onClick={() => setShowViewFilterPanel(true)}
          className={`rounded-3xl border-2 flex items-center gap-3 px-3.5 py-2.5 w-[198px] transition-all
            ${viewFilter !== 'all'
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-purple-500 shadow-lg'
              : 'bg-white text-gray-800 border-gray-300 hover:shadow-xl'}
          `}
          title="Filtrar por tipo de vista"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${viewFilter !== 'all' ? 'bg-white border-purple-400 text-purple-600' : 'bg-white border-gray-300 text-gray-400'}`}>
            <Users className={`w-7 h-7 ${viewFilter !== 'all' ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-left flex-1">
            <div className={`text-sm font-semibold ${viewFilter !== 'all' ? 'text-white' : 'text-gray-800'}`}> 
              {viewFilter === 'all' ? 'Todas las partidas' :
               viewFilter === 'onlyEmpty' ? 'Solo vacías' :
               viewFilter === 'onlyAvailable' ? 'Con espacio' : 'Mis partidas'}
            </div>
            <div className={`text-xs ${viewFilter !== 'all' ? 'text-purple-100' : 'text-gray-500'}`}>Estado de partida</div>
          </div>
        </button>

        {/* Botón Guardar Filtros */}
        <button
          onClick={async () => {
            if (!currentUser) return;
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
          }}
          disabled={!currentUser || (timeSlotFilter === 'all' && viewFilter === 'all')}
          className={`px-3.5 py-1.5 rounded-2xl font-medium text-xs transition-all shadow-md hover:shadow-lg w-full text-center ${
            (timeSlotFilter !== 'all' || viewFilter !== 'all')
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          💾 Guardar búsqueda
        </button>

        {/* Botón Eliminar Filtros */}
        <button
          onClick={async () => {
            if (!currentUser) return;
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
                console.log('✅ Filtros de partidas eliminados');
              }
            } catch (error) {
              console.error('❌ Error al eliminar filtros de partidas:', error);
            }
          }}
          disabled={!currentUser || !(savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all'))}
          className={`px-3.5 py-1.5 rounded-2xl font-medium text-xs transition-all shadow-md hover:shadow-lg w-full text-center ${
            savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all')
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          🗑️ Eliminar filtros
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
                onClick={() => { 
                  setViewFilter('onlyEmpty'); 
                  setShowViewFilterPanel(false); 
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'onlyEmpty' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                ⭕ Solo partidas vacías (0 jugadores)
              </button>
              <button
                onClick={() => { 
                  setViewFilter('onlyAvailable'); 
                  setShowViewFilterPanel(false); 
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'onlyAvailable' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                ✅ Con espacio disponible (1-3 jugadores)
              </button>
              <button
                onClick={() => { 
                  setViewFilter('onlyMyMatches'); 
                  setShowViewFilterPanel(false); 
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  viewFilter === 'onlyMyMatches' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                👤 Solo mis partidas
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
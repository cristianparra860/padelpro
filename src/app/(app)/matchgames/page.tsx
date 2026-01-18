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
import ReactDOM from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
          .map((mg: MatchGame) => {
            const userBooking = mg.bookings.find(b => b.userId === currentUser.id);
            return {
              timeSlotId: mg.id,
              status: userBooking?.status || 'PENDING', // Usar estado real (CONFIRMED/PENDING)
              date: mg.start
            };
          });

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
      {/* 🌀 PORTAL DE FILTROS A LA BARRA LATERAL */}
      {mounted && document.getElementById('sidebar-filters-portal') && ReactDOM.createPortal(
        <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-left-4 duration-300">

          {/* Separador visual */}
          <div className="w-3/4 h-px bg-gray-200 mx-auto my-1 opacity-50"></div>

          {/* 🕐 Filtro de horario */}
          <button
            type="button"
            onClick={() => setShowTimeFilterPanel(true)}
            className={`rounded-3xl hover:shadow-xl transition-all flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]
              ${timeSlotFilter !== 'all'
                ? 'bg-white shadow-2xl scale-105 border-2 border-purple-100 ring-2 ring-purple-100'
                : 'bg-white shadow-lg border-2 border-white hover:border-gray-200'}
            `}
            title="Filtrar por horario"
          >
            <div className={`rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 w-8 h-8 md:w-12 md:h-12
              ${timeSlotFilter !== 'all' ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200'}`}>
              <Clock className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden">
              <div className={`text-[10px] font-semibold md:text-sm truncate ${timeSlotFilter !== 'all' ? 'text-purple-700' : 'text-gray-500'}`}>
                {timeSlotFilter === 'all' ? 'Horario' :
                  timeSlotFilter === 'morning' ? 'Mañana' :
                    timeSlotFilter === 'midday' ? 'Mediodía' : 'Tarde'}
              </div>
              <div className="hidden md:block text-xs text-gray-400 truncate">
                {timeSlotFilter === 'all' ? 'Todas las horas' : 'Filtro activo'}
              </div>
            </div>
          </button>

          {/* 👥 Filtro de tipo de vista */}
          <button
            type="button"
            onClick={() => setShowViewFilterPanel(true)}
            className={`rounded-3xl hover:shadow-xl transition-all flex flex-col items-center gap-0.5 px-0.5 py-0.5 w-[55px] sm:w-[80px] md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5 md:w-[170px] lg:w-[190px] xl:w-[210px]
              ${viewFilter !== 'all'
                ? 'bg-white shadow-2xl scale-105 border-2 border-indigo-100 ring-2 ring-indigo-100'
                : 'bg-white shadow-lg border-2 border-white hover:border-gray-200'}
            `}
            title="Filtrar por tipo de vista"
          >
            <div className={`rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 w-8 h-8 md:w-12 md:h-12
              ${viewFilter !== 'all' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-transparent group-hover:bg-white group-hover:border-gray-200'}`}>
              <Users className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="text-center md:text-left md:flex-1 md:min-w-0 md:overflow-hidden">
              <div className={`text-[10px] font-semibold md:text-sm truncate ${viewFilter !== 'all' ? 'text-indigo-700' : 'text-gray-500'}`}>
                {viewFilter === 'all' ? 'Estado' :
                  viewFilter === 'onlyEmpty' ? 'Vacías' :
                    viewFilter === 'onlyAvailable' ? 'Con sitio' : 'Mías'}
              </div>
              <div className="hidden md:block text-xs text-gray-400 truncate">
                {viewFilter === 'all' ? 'Todas' : 'Filtro activo'}
              </div>
            </div>
          </button>

          {/* Botones de Acción (Guardar/Eliminar) - Solo visibles si hay cambios */}
          {(timeSlotFilter !== 'all' || viewFilter !== 'all') && (
            <div className="flex flex-col gap-2 mt-1 w-[55px] sm:w-[80px] md:w-[170px] lg:w-[190px] xl:w-[210px]">
              {/* Botón Guardar Filtros */}
              <button
                onClick={async () => {
                  if (!currentUser) return;
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
                      toast({ title: "Filtros guardados", className: "bg-green-600 text-white" });
                    }
                  } catch (error) {
                    console.error('❌ Error al guardar filtros de partidas:', error);
                  }
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                💾 <span className="hidden md:inline">Guardar</span>
              </button>

              {/* Botón Eliminar Filtros */}
              <button
                onClick={async () => {
                  if (!currentUser) return;
                  try {
                    const response = await fetch('/api/users/filter-preferences', {
                      method: 'DELETE',
                      headers: { 'x-user-id': currentUser.id }
                    });
                    if (response.ok) {
                      setTimeSlotFilter('all');
                      setViewFilter('all');
                      setSavedFilters(null);
                      console.log('✅ Filtros de partidas eliminados');
                    }
                  } catch (error) {
                    console.error('❌ Error al eliminar filtros de partidas:', error);
                  }
                }}
                disabled={!(savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all'))}
                className={`border rounded-xl py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors
                    ${(savedFilters && (savedFilters.timeSlot !== 'all' || savedFilters.viewType !== 'all'))
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 cursor-pointer'
                    : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed hidden'
                  }
                  `}
              >
                🗑️ <span className="hidden md:inline">Limpiar</span>
              </button>
            </div>
          )}

        </div>,
        document.getElementById('sidebar-filters-portal') as HTMLElement
      )}

      {/* Panel de filtro de horario */}
      {showTimeFilterPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowTimeFilterPanel(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Filtrar por Horario</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setTimeSlotFilter('all'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${timeSlotFilter === 'all' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                🌍 Todas las horas
              </button>
              <button
                onClick={() => { setTimeSlotFilter('morning'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${timeSlotFilter === 'morning' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                🌅 Mañana (6:00 - 12:00)
              </button>
              <button
                onClick={() => { setTimeSlotFilter('midday'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${timeSlotFilter === 'midday' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                ☀️ Mediodía (12:00 - 18:00)
              </button>
              <button
                onClick={() => { setTimeSlotFilter('evening'); setShowTimeFilterPanel(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${timeSlotFilter === 'evening' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
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
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${viewFilter === 'all' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                🎾 Todas las partidas
              </button>
              <button
                onClick={() => {
                  setViewFilter('onlyEmpty');
                  setShowViewFilterPanel(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${viewFilter === 'onlyEmpty' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                ⭕ Solo partidas vacías (0 jugadores)
              </button>
              <button
                onClick={() => {
                  setViewFilter('onlyAvailable');
                  setShowViewFilterPanel(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${viewFilter === 'onlyAvailable' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
                  }`}
              >
                ✅ Con espacio disponible (1-3 jugadores)
              </button>
              <button
                onClick={() => {
                  setViewFilter('onlyMyMatches');
                  setShowViewFilterPanel(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${viewFilter === 'onlyMyMatches' ? 'bg-purple-100 text-purple-900 font-semibold' : 'hover:bg-gray-100'
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
      <div className="ml-0 md:ml-[15rem] lg:ml-[17rem] xl:ml-[19rem] mr-0 md:mr-4 px-6 md:pl-4 md:pr-0 pt-6 pb-1 matchgames-scrollbar overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>

        <div className="mb-4 flex items-center gap-3 -mt-3">
          {/* Button Hoy */}
          <button
            onClick={() => setSelectedDate(new Date())}
            className="group relative px-6 py-2 bg-black hover:bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 border-2 border-white ring-1 ring-gray-200/50"
          >
            Hoy
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
          </button>

          {/* Button Mañana */}
          <button
            onClick={() => setSelectedDate(new Date(Date.now() + 86400000))}
            className="group relative px-6 py-2 bg-black hover:bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300 border-2 border-white ring-1 ring-gray-200/50"
          >
            Mañana
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
          </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-0 gap-y-4 md:gap-x-1 w-full max-w-full justify-items-center md:justify-items-start">
            {filteredMatches.map((match, index) => (
              <div
                key={match.id}
                className="bubble-appear"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <MatchGameCard
                  matchGame={match}
                  currentUser={currentUser}
                  onBookingSuccess={loadMatches}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}